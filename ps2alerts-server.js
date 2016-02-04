/**
 * Author: Maelstrome26
 *
 * Description: This Node script acts as both a client and a server for interacting with incoming data from the DBG streaming API as well as passing data to connected clients at PS2Alerts.com.
 *
 * Note: This script is in DIRE need of a rewrite, it has grown beyond being managable. I'm currently not innovating on it at the moment as I don't have much time on my hands nowadays.
 */

//Includes
var WebSocket = require('ws');
var mysql = require('mysql');
var http = require('http');
var url = require('url');
var clone = require('clone');
var clc = require('cli-color');
var time = require('time');
var critical = clc.red.bold;
var warning = clc.yellow;
var notice = clc.blueBright;
var success = clc.green.bold;
var usage = require('usage');
var pid = process.pid; // you can use any valid PID instead
var nodemailer = require('nodemailer');

var configStore = require('./config.js');
var config = configStore.getConfig(); // Call the getConfig funtion to load the config
var supplementalConfig = configStore.getSupplementalConfig();

// Main Database Pool
var pool = mysql.createPool({
    connectionLimit: 700,
    host: config.database.primary.host,
    user: config.database.primary.user,
    password: config.database.primary.pass,
    database: config.database.primary.name,
    waitForConnections: true, // Flag to throw errors when connections are being starved.
    supportBigNumbers: true,
    bigNumberStrings: true
});

// Cache pool
var cachePool = mysql.createPool({
    connectionLimit: 20,
    host: config.database.cache.host,
    user: config.database.cache.user,
    password: config.database.cache.pass,
    database: config.database.cache.name,
    waitForConnections: true,
    supportBigNumbers: true,
    bigNumberStrings: true
});

// Better handling of uncaught Exceptions, allowing you to email yourself or log it or whatnot.
process.on('uncaughtException', function(err)
{
    console.error(new Date().toUTCString() + ' uncaughtException:', err.message);
    console.error(err.stack);

    reportError(err, "uncaughtException");

    process.exit(1);
});

/**
 * Global Variable Setup
 *
 */
var instances = {};
var populationInstances = {};
var subscriptions = 0; // Check to see if we have valid subscriptions
var subscriptionsRetry = 0;
var connectionState = 0;
var activesNeeded = false; // A flag set when the activeAlert function requires to be called

/**
 * Intervals
 */
var upcomingCheckInterval;
var conWatcherInterval;
var subWatcherInterval;
var perfInterval;

var wsClient;
var perfStats = {};
var perfSecs = 0;

/**************
Admin API Keys
***************/

var apiKeys = {};

//Pulls API keys from the database so that clients may communicate with this websocket server safely
function generate_api_keys()
{
    cachePool.getConnection(function(poolErr, dbConnection)
    {
        if (poolErr)
        {
            throw(poolErr);
        }

        dbConnection.query('SELECT * FROM APIUsers', function(err, result)
        {
            dbConnection.release();

            if (err)
            {
                throw(err);
            }
            else
            {
                for (var i = result.length - 1; i >= 0; i--) // Build the API key object
                {
                    apiKeys[i] = {};

                    apiKeys[i].apikey = String(result[i].apikey);
                    apiKeys[i].user = result[i].user;
                    apiKeys[i].site = result[i].site;
                    apiKeys[i].admin = result[i].admin;
                }
            }
        });
    });
}

// Functionality to authenticate requests and allow certain actions to happen
function checkAPIKey(APIKey, callback)
{
    var isValid = false;
    var admin = false;
    var username = false;

    APIKey = String(APIKey);

    if (APIKey != "undefined")
    {
        if (config.debug.auth === true)
        {
            console.log (notice("CHECKING API KEY: "+APIKey));
        }

        Object.keys(apiKeys).forEach(function(i) // Loop through the API keys array to check against supplied key
        {
            if (apiKeys[i].apikey == APIKey) // If theres a match
            {
                isValid = true;

                if (config.debug.auth === true)
                {
                    console.log(success("API KEY MATCH"));
                }

                username = apiKeys[i].user;

                if (apiKeys[i].admin != "0") // If an admin
                {
                    admin = true;
                }
            }
        });
    }

    callback(isValid, username, admin);
}

/*********************************************
    FIRE ZE LAZORS (start the process going)
*********************************************/

generate_weapons(function() // Generate weapons first, before loading websocket
{
    console.log("WEAPONS READY!");
    conWatcherInterval = setInterval(function() //You can change this if you want to reconnect faster, or slower.
    {
        conWatcher();
    }, 3000);

    subWatcherInterval = setInterval(function()
    {
        subWatcher();
    }, 10000); //You can change this if you want to reconnect faster, or slower.

    generate_api_keys();

    // BOOM
    wsClient = new persistentClient();
});

/**************
    Client    *
**************/
function persistentClient(wss)
{
    console.log("HOUSTON WE ARE A GO!");
    var connected = true;

    //Return Status of connection.
    this.isConnected = function()
    {
        return connected;
    };

    this.getClient = function()
    {
        if(client !== undefined)
        {
            return client;
        }
        else
        {
            return undefined;
        }
    };

    console.log("Connecting Client...");

    client = new WebSocket('ws://push.api.blackfeatherproductions.com/?apikey='+config.extendedAPIKey); // Jhett's API

    // Websocket Event callbacks
    client.on('open', function()
    {
        console.log(success("CONNECTED"));

        connectionState = 1;

        pool.getConnection(function(poolErr, dbConnectionI)
        {
            if (poolErr) { throw (poolErr); }

            restoreSubs(client, dbConnectionI, function() // Fire subscriptions if they are needed
            {
                console.log(success("Subscriptions restored!"));
                dbConnectionI.release();
            });
        });
    });

    client.on('message', function(data, flags)
    {
        if(config.debug.datadump === true)
        {
            console.log(data);
        }

        pool.getConnection(function(poolErr, dbConnection)
        {
            if (poolErr)
            {
                console.log(poolErr);
                throw(poolErr);
            }

            processMessage(data, client, wss, dbConnection);
            dbConnection.release();
        });
    });

    client.on('error', function(error)
    {
        console.log((new Date()) + error.toString());
        connected = false;
    });

    client.on('close', function(code)
    {
        if (config.debug.clients === true)
        {
            console.log((new Date()) + ' Websocket Connection Closed [' + code +']');
        }
        connected = false;
    });
}

/************************
    Client Functions    *
************************/

var maintenance;
var eventsMonitor;
var lastWorldDisruption = {};
var worldStatus = { // Assuming online always at first run
    1: "online",
    10: "online",
    13: "online",
    17: "online",
    19: "online",
    25: "online",
    1000: 'online',
    1001: 'online',
    1002: 'online',
    1003: 'online',
    1004: 'online',
    2000: 'online',
    2001: 'online'
};


function checkMapInitial(callback)
{
    pool.getConnection(function(poolErr, dbConnectionMap)
    {
        if (poolErr)
        {
            throw(poolErr);
        }

        Object.keys(instances).forEach(function(key) {
            dbConnectionMap.query("SELECT * FROM ws_map_initial WHERE resultID = "+instances[key].resultID, function(err, result) {
                if (err)
                {
                    throw(err);
                }

                if (result[0] === undefined) { // If no map initial records exist, run it

                    console.log(critical("MAP INITIAL MISSING FOR ALERT: #"+instances[key].resultID));
                    insertInitialMapData(instances[key], function()
                    {
                        console.log(success("Inserted Initial Map data succesfully"));
                    });
                }
            });
        });

        dbConnectionMap.release();

    });
    callback();
}

function onConnect(client) // Set up the websocket
{
    if (config.debug.clients === true)
    {
        console.log(new Date() + ' WebSocket client connected!');
    }

    //"outfits":["37514584004240963"] 37514584004240963 DIGT | 37524142189447090 = PS2AlertsTesting

    if (config.toggles.metagame === true) // If alerts are enabled
    {
        console.log(success("SENDING METAGAME SUBSCRIPTION MESSAGE"));
        var alertsMessage  = '{"action":"subscribe","event":"MetagameEvent","all":"true"}'; // Subscribe to all alerts that happen

        try {
            client.send(alertsMessage);
        } catch (e) {
            reportError("Error: "+e, "Metagame Subscription Message Failed", true);
        }

        if (config.toggles.populationchange === true)
        {
            var populationChangeMessage = '{"action":"subscribe","event":"PopulationChange","population_types":["zone"]}';

            console.log(success(populationChangeMessage));

            try {
                client.send(populationChangeMessage);
            } catch (e) {
                console.log(critical("ERROR SENDING  MESSAGE"));
                reportError("Error from API Socket - "+e, "Population Message", true);
                return false;
            }
        }
    }

    if (config.debug.instances === true)
    {
        console.log("INSTANCES ARRAY BUILT");

        console.log("============= INSTANCES DETECTED ===============");
        console.log(instances);
        console.log("================================================");
    }

    /* Fire instances dependant code */
    var eventsTimer = 10 * 1000;

    clearInterval(eventsMonitor);
}

var eventTypes = ['MetagameEvent', 'Combat', 'FacilityControl', 'VehicleDestroy', 'PopulationChange', 'ExperienceEarned', 'AchievementEarned'];

//Processes Messages received from the client.
function processMessage(messageData, client, wss, dbConnection)
{
    var message;

    try // Check if the message we get is valid json.
    {
        message = JSON.parse(messageData);
    }
    catch(exception)
    {
        console.log(messageData);
        message = null;

        reportError("FAILURE TO PARSE JSON", messageData);
    }

    if (message) // If valid
    {
        if (message.action && message.action == "activeMetagameEvents") {
            console.log(notice("Sending Actives to processor"));
            processActives(message);
        }

        var eventType  = message.event_type;
        var eventCheck = eventTypes.indexOf(eventType);

        checkDuplicateMessages(message, function(messageValid)
        {
            if (messageValid === true)
            {
                if (eventCheck != -1) // If a valid event type
                {
                    message = message.payload;

                    if (eventType == "MetagameEvent" && config.toggles.metagame === true) // Alert Processing
                    {
                        if (config.debug.metagame === true)
                        {
                            console.log(JSON.stringify(message, null, 4));
                        }

                        var alertType = message.metagame_event_type_id;
                        var world = message.world_id;

                        APIAlertTypes(alertType, function(typeData) // Check if alerts are supported
                        {
                            if (typeData !== null) // If a valid alert type
                            {
                                if (!message.zone_id)
                                {
                                    console.log(critical(JSON.stringify(message, null, 4)));
                                    throw("MISSING ZONE ID FOR WORLD: "+world);
                                }

                                console.log(notice("Processing Alert Message"));

                                findResultID(message, eventType, function(resultIDArray) // Get resultID for all functions
                                {
                                    if (message.status == "1") // If started
                                    {
                                        if (world != "19")
                                        {
                                            if (resultIDArray.length === 0)
                                            {
                                                console.log(success("================== STARTING ALERT! =================="));
                                                insertAlert(message, dbConnection, function(resultID)
                                                {
                                                    console.log(success("================ INSERTED NEW ALERT #"+resultID+" ("+supplementalConfig.worlds[world]+") ================"));
                                                });
                                            }
                                            else
                                            {
                                                console.log(critical("RESULT ALREADY FOUND, IGNORING"));
                                                reportError("Result already found. "+JSON.stringify(message, null, 4), "Insert Alert");
                                            }
                                        }
                                        else
                                        {
                                            console.log(critical("Recieved Jaeger Alert Start message. Ignored."));
                                        }
                                    }
                                    else if (message.status == "0") // If alert end
                                    {
                                        console.log(notice(resultIDArray));
                                        var resultID = resultIDArray[0];

                                        if (resultID !== undefined)
                                        {
                                            console.log(success("================== ENDING ALERT! =================="));
                                            endAlert(message, resultID, client, dbConnection, function(resultID)
                                            {
                                                console.log(success("================ SUCCESSFULLY ENDED ALERT #"+resultID+" ("+supplementalConfig.worlds[world]+") ================"));
                                            });
                                        }
                                        else
                                        {
                                            reportError("UNDEFINED RESULTID ALERT END - World: "+world, "End Alert");
                                        }
                                    }
                                    else if (message.status == "2")
                                    {
                                        if (config.debug.metagame === true)
                                        {
                                            console.log("Alert update recieved.");
                                        }
                                    }
                                });
                            }
                            else
                            {
                                console.log(critical("INVALID / UNSUPPORTED ALERT TYPE: "+alertType+" - WORLD: #"+world));
                                reportError("UNSUPPORTED ALERT TYPE DETECTED: "+alertType, "Insert Alert");
                            }
                        });
                    }
                    else
                    {
                        findResultID(message, eventType, function(resultIDArray) // Get resultID for all functions
                        {
                            if (config.debug.resultID === true && config.debug.jaeger === false)
                            {
                                if (resultIDArray.length === 0)
                                {
                                    console.log(critical("RESULT ID COULD NOT BE FOUND!"));
                                    console.log(resultIDArray);
                                }
                                else
                                {
                                    console.log(notice("ResultIDs Found:"));
                                    console.log(resultIDArray);
                                }
                            }

                            for (var i = resultIDArray.length - 1; i >= 0; i--)
                            {
                                var resultID = resultIDArray[i];
                                if (config.toggles.combat === true)
                                {
                                    if (eventType == "Combat") // If a combat event
                                    {
                                        cachePool.getConnection(function(poolErr, dbConnectionCache)
                                        {
                                            if (poolErr)
                                            {
                                                throw(poolErr);
                                            }

                                            combatParse(message, resultID, dbConnectionCache);
                                            dbConnectionCache.release();
                                        });
                                    }
                                }
                                if (config.toggles.facilitycontrol === true)
                                {
                                    if (eventType == "FacilityControl") // If a territory Update
                                    {
                                        updateAlert(message, resultID, function()
                                        {
                                            console.log(success("PROCESSED FACILITY CONTROL"));
                                        });
                                    }
                                }
                                if (config.toggles.vehicledestroy === true)
                                {
                                    if (eventType == "VehicleDestroy")
                                    {
                                        insertVehicleStats(message, resultID, 0, function()
                                        {
                                            if (config.debug.vehicles === true)
                                            {
                                                console.log(success("PROCESSED VEHICLE KILLS"));
                                            }
                                        });
                                    }
                                }

                                if (config.toggles.populationchange === true)
                                {
                                    if (eventType == "PopulationChange")
                                    {
                                        var VSPop    = message.population_vs;
                                        var NCPop    = message.population_nc;
                                        var TRPop    = message.population_tr;
                                        var TotalPop = message.population_total;
                                        var world = message.world_id;
                                        var zone = message.zone_id;

                                        if (config.debug.population === true)
                                        {
                                            console.log(notice("POPULATION CHANGE DETECTED"));

                                            console.log(message);
                                        }

                                        if (populationInstances[resultID] === undefined)
                                        {
                                            populationInstances[resultID] = {
                                                VS: 0,
                                                NC: 0,
                                                TR: 0,
                                                total: 0,
                                                world: world,
                                                zone: zone
                                            };
                                        }

                                        populationInstances[resultID] = {
                                            VS: VSPop,
                                            NC: NCPop,
                                            TR: TRPop,
                                            total: TotalPop,
                                            world: world,
                                            zone: zone
                                        };

                                        if (config.debug.population === true)
                                        {
                                            console.log(populationInstances[resultID]);
                                        }

                                        insertPopulationStats(resultID, dbConnection, function()
                                        {
                                            if (config.debug.population === true)
                                            {
                                                console.log("Processed Population Data");
                                            }
                                        });
                                    }
                                }

                                if (config.toggles.xpmessage === true)
                                {
                                    if (eventType == "ExperienceEarned")
                                    {
                                        pool.getConnection(function(poolErr, dbConnectionXP)
                                        {
                                            if (poolErr)
                                            {
                                                throw(poolErr);
                                            }
                                            insertExperience(message, resultID, dbConnectionXP, function()
                                            {
                                                dbConnectionXP.release();
                                            });
                                        });
                                    }
                                }

                                if (config.toggles.achievements === true)
                                {
                                    if (eventType == "AchievementEarned")
                                    {
                                        pool.getConnection(function(poolErr, dbConnectionCheevo)
                                        {
                                            if (poolErr)
                                            {
                                                throw(poolErr);
                                            }
                                            insertAchievement(message, resultID, dbConnectionCheevo, function()
                                            {
                                                dbConnectionCheevo.release();
                                            });
                                        });
                                    }
                                }
                            } // End of result forEach
                        });
                    }
                }
                else // If a system message
                {
                    var known = 0;
                    if (message.websocket_event)
                    {
                        onConnect(client);
                        console.log(message);

                    }

                    if (message.subscriptions !== undefined)
                    {
                        known = 1;
                        subscriptions = 1;
                        if(message.subscriptions.Combat !== undefined)
                        {
                            console.log(notice("COMBAT SUBS:"));
                            console.log(message.subscriptions.Combat.worlds);
                            console.log(message.subscriptions.Combat.zones);
                            console.log("----------------------------");
                        }

                        if (message.subscriptions.FacilityControl !== undefined)
                        {
                            console.log(notice("FACILITY CONTROL SUBS:"));
                            console.log(message.subscriptions.FacilityControl.worlds);
                            console.log(message.subscriptions.FacilityControl.zones);
                            console.log("----------------------------");
                        }

                        if(message.subscriptions.VehicleDestroy !== undefined)
                        {
                            console.log(notice("VEHICLE COMBAT SUBS:"));
                            console.log(message.subscriptions.VehicleDestroy.worlds);
                            console.log(message.subscriptions.VehicleDestroy.zones);
                            console.log("----------------------------");
                        }

                        if(message.subscriptions.PopulationChange !== undefined)
                        {
                            console.log(notice("POPUALTION CHANGE SUBS:"));
                            console.log(message.subscriptions.PopulationChange.worlds);
                            console.log(message.subscriptions.PopulationChange.zones);
                            console.log("----------------------------");
                        }

                        if(message.subscriptions.MetagameEvent !== undefined)
                        {
                            console.log(notice("METAGAME SUBS RECIEVED:"));

                            if (config.debug.API === true)
                            {
                                console.log(message.subscriptions.MetagameEvent);
                            }
                        }
                    }

                    if (message.action == "activeAlerts")
                    {
                        known = 1;
                        console.log(notice("ACTIVE ALERTS RECIEVED:"));

                        if (config.debug.API === true)
                        {
                            console.log(message);
                        }
                    }

                    if (message.event_type == "ServiceStateChange")
                    {
                        known = 1;
                        if (message.payload.online !== undefined)
                        {
                            var time = new Date().getTime();
                            time = parseInt(time / 1000); // To convert to seconds

                            if (lastWorldDisruption[worldID] === undefined)
                            {
                                lastWorldDisruption[worldID] = null;
                            }

                            var worldID = message.payload.world_id;
                            if (message.payload.online == "0")
                            {
                                worldStatus[worldID] = "offline";
                                lastWorldDisruption[worldID] = time;

                                console.log(critical("WORLD #"+worldID+" HAS CRASHED!"));
                            }
                            else if (message.payload.online == "1")
                            {
                                worldStatus[worldID] = "online";
                                console.log(success("WORLD #"+worldID+" IS ONLINE!"));

                                activesNeeded = true;

                                var limit = lastWorldDisruption[worldID] + 30; // Last recorded disruption + 30 seconds
                                if (time > limit)
                                {
                                    console.log(critical("LOGGING WORLD #"+worldID+" DISRUPTION"));

                                    reportError("World :"+worldID+" has failed!", "World disruption");

                                    pool.getConnection(function(poolErr, dbConnectionDist)
                                    {
                                        if (poolErr)
                                        {
                                            throw(poolErr);
                                        }

                                        if (lastWorldDisruption[worldID] === null)
                                        {
                                            lastWorldDisruption[worldID] = time - 30;
                                        }

                                        var insertDisruption = {
                                            started: lastWorldDisruption[worldID],
                                            ended: time,
                                            world: worldID
                                        };

                                        dbConnectionDist.query("INSERT INTO ws_disruption SET ?", insertDisruption, function(err, result)
                                        {
                                            if (err)
                                            {
                                                reportError(err, "Insert Disruption");
                                            }

                                            dbConnectionDist.release();
                                        });
                                    });
                                }
                                else
                                {
                                    console.log(notice("World disruption was out of limit"));
                                }

                                lastWorldDisruption[worldID] = null;
                            }
                        }
                    }

                    if (known === 0) // If unknown message
                    {
                        console.log(message);
                        console.log(notice("Ignoring message."));
                    }
                }
            }
            else
            {
                if (eventType !== "PopulationChange")
                {
                    var date = new Date();
                    console.log(critical("Type: "+eventType));
                    if (config.debug.duplicates === true)
                    {
                        console.log(notice(JSON.stringify(message, null, 4)));
                    }
                    console.log(critical("DUPLICATE MESSAGE DETECTED ON W: "+message.payload.world_id+" - Z: "+message.payload.zone_id+", IGNORING! "+date));
                }
            }
        });
    }
}

function findResultID(message, eventType, callback)
{
    var returnedResults = [];

    var world = message.world_id;
    var zone = message.zone_id;

    if (eventType == "MetagameEvent" && world == "19") {
        console.log(critical("Blocked Jaeger MetaGame Event message"));
        return callback(returnedResults);
    }
    else
    {
        var time = new Date().getTime();
        time = parseInt(time / 1000); // To convert to seconds

        Object.keys(instances).forEach(function(key)
        {
            var valid = true;
            if (instances[key].world == world && instances[key].zone == zone)
            {
                var startTime = instances[key].startTime;
                var endTime = instances[key].endTime;

                if (isNaN(startTime) === true)
                {
                    console.log(instances[key]);
                    throw('startTime is NaN for instance');
                }

                if (isNaN(endTime) === true)
                {
                    console.log(instances[key]);
                    throw('endTime is NaN for instance');
                }

                if (eventType !== "MetagameEvent" && eventType !== "PopulationChange")
                {
                    if (startTime < time && endTime > time) // If message is still within time
                    {
                        returnedResults.push(instances[key].resultID);
                    }
                    else
                    {
                        if (config.debug.resultID === true)
                        {
                            console.log(warning("MESSAGE RECIEVED OUT OF GAME TIME FOR RESULT #"+instances[key].resultID));
                        }
                    }
                }
                else
                {
                    returnedResults.push(instances[key].resultID);
                }
            }
        });
    }

    return callback(returnedResults);
}

function reportError(error, loc, severeError)
{
    pool.getConnection(function(poolErr, dbConnectionError)
    {
        if (poolErr)
        {
            throw(poolErr);
        }

        var time = new Date().getTime();

        var errPost =
        {
            errorReturned: error,
            errorLocation: loc,
            time: time
        };

        dbConnectionError.query('INSERT INTO ws_errors SET ?', errPost, function(err, result)
        {
            console.log(critical("++++++++++++++++++++++ ERROR DETECTED!!! ++++++++++++++++++++++"));
            console.log(notice(new Date().toString()));
            console.log(error);
            console.log(critical("LOCATION: "+loc));
            console.log(critical("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"));

            dbConnectionError.release();
        });

        if (severeError === true) {
            resetScript();
        }
    });
}

function resetScript() {
    reportError("RESTARTING SCRIPT", "resetScript");
    process.exit(0);
};

/**
 * message = {
 * 		world_id,
 * 		zone_id,
 * 		metagame_event_type_id,
 * 		start_time,
 * 		control_vs,
 * 		control_nc,
 * 		control_tr,
 * 		instance_id
 * }
 */

function insertAlert(message, dbConnectionA, callback)
{
    console.log(notice("ALERT MESSAGE FOLLOWS:"));
    console.log(message);

    var world = message.world_id;
    var zone = message.zone_id;
    var alertType = message.metagame_event_type_id;

    console.log(notice("NEW ALERT DETECTED!"));

    dbConnectionA.query("SELECT * FROM ws_results WHERE ResultStartTime = "+message.start_time+" AND ResultServer="+world, function(err, result)
    {
        if (err)
        {
            throw(err);
        }

        if (result[0] !== undefined)
        {
            console.log(critical("ATTEMPTED TO ADD AN EXISTING ALERT!"));
            reportError("Attempted to insert alert when already exists! World: "+world+" - Zone: "+zone, "Insert Alert");
            return;
        }

        if (message.start_time) // If a valid alert message
        {
            var returned = true;

            var empires = [];
            var attacker = 0;
            var top = 0;

            empires[1] = message.control_vs;
            empires[2] = message.control_nc;
            empires[3] = message.control_tr;

            console.log("CONTROL: "+empires);

            for (var i = empires.length - 1; i >= 1; i--) {
                if (empires[i] > top)
                {
                    top = empires[i];
                    attacker = factions[i];
                }
            }

            empires.sort(function(a, b){return b-a;});

            var now = new time.Date();
            var timezone = 'UTC';

            var PST = 'America/Los_Angeles';
            var CDT = 'America/Swift_Current';
            var EST = 'America/New_York';
            var CEST = 'Europe/Paris';
            var AEST = 'Australia/Brisbane';

            // Calculate hour offset
            if (world == 1) { // Connery
                timezone = PST;
            } else if (world == 10) { // Miller
                timezone = CEST; // Central European Standard time
            } else if (world == 13) { // Cobad
                timezone = CEST; // Central European Standard time
            } else if (world == 17) { // Emerald
                timezone = EST; // Eastern Standard time
            } else if (world == 25) { // Briggs
                timezone = AEST; // Aussie Eastern Time
            } else if (world >= 2000 ) {
                timezone = CEST; // Central European Standard time
            } else if (world >= 1000 ) {
                timezone = CDT; // Central Standard Time
            }

            now.setTimezone(timezone);

            var timeHour = now.getHours();
            var timeBracket = 'TEST';

            console.log(timeHour);

            if (timeHour >= 17 && timeHour <= 23) { // Prime
                timeBracket = 'PRI';
            } else if (timeHour >= 12 && timeHour <= 16) { // Afternoon
                timeBracket = 'AFT';
            } else {
                timeBracket = 'MOR';
            }

            console.log(timeBracket);

            var startAlert =
            {
                instanceID: message.instance_id,
                ResultStartTime: message.start_time,
                ResultServer: world,
                ResultTimeType: timeBracket,
                ResultAlertCont: zone,
                ResultAlertType: alertType,
                ResultMajority: attacker,
                InProgress: 1
            };

            console.log("================ INSERTING INITIAL RECORD ================");

            dbConnectionA.query('INSERT INTO ws_results SET ?', startAlert, function(err, result)
            {
                if (err)
                {
                    if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                    {
                        console.log(message);
                        reportError(err, "Insert Capture Record");
                    }
                    else
                    {
                        console.log(critical("INVALID / DUPLICATED ALERT RECORD DETECTED! Skipping!"));
                        reportError("Duplicate Alert, World: "+world+" - ZONE: "+zone, message);
                    }
                }
                else
                {
                    var resultID = result.insertId;
                    var endtime = calcEndTime(message.start_time, message.metagame_event_type_id);

                    var monitorPost =
                    {
                        instanceID: message.instance_id,
                        world: message.world_id,
                        zone: message.zone_id,
                        resultID: resultID,
                        started: message.start_time,
                        endtime: endtime,
                        type: alertType
                    };

                    insertInitialMapData(monitorPost, function()
                    {
                        console.log(success("Fired initial map script"));
                    });

                    var toSend =
                    {
                        "startTime": message.start_time,
                        "endTime": endtime,
                        "world": world,
                        "zone": zone,
                        "resultID": resultID,
                        "controlVS": message.control_vs,
                        "controlNC": message.control_nc,
                        "controlTR": message.control_tr,
                    };

                    toSend.remaining = (parseInt(toSend.endTime) - parseInt(toSend.startTime));

                    console.log(critical("Sending Websocket Message: "));
                    console.log(critical(JSON.stringify(toSend, null, 4)));

                    sendMonitor("alertStart", toSend);

                    dbConnectionA.query('INSERT INTO ws_instances SET ?', monitorPost, function(err, result)
                    {
                        if (err)
                        {
                            reportError(err, "Insert Instances");
                            var returned = false;
                        }
                        else
                        {
                            console.log(success("INITIAL INSERT OF ALERT: #"+resultID+" SUCCESSFUL!"));
                            console.log(success("====================================================="));

                            var factionArray =
                            {
                                resultID: resultID,
                                killsVS: 0,
                                killsNC: 0,
                                killsTR: 0,
                                deathsVS: 0,
                                deathsNC: 0,
                                deathsTR: 0,
                                teamKillsVS: 0,
                                teamKillsNC: 0,
                                teamKillsTR: 0,
                                suicidesVS: 0,
                                suicidesNC: 0,
                                suicidesTR: 0,
                                totalKills: 0,
                                totalDeaths: 0,
                                totalTKs: 0,
                                totalSuicides: 0
                            };

                            dbConnectionA.query('INSERT INTO ws_factions SET ?', factionArray, function(err, result)
                            {
                                if (err)
                                {
                                    reportError(err, "Insert Factions Record");
                                    var returned = false;
                                }
                                else
                                {
                                    fireSubscriptions(message, resultID, "subscribe");

                                    callback(resultID);
                                }
                            });
                        }
                    });
                }
            });
        }
        else
        {
            console.log(critical("INVALID START TIME RECIEVED, SKIPPING!"));
        }
    });
}

function endAlert(message, resultID, client, dbConnectionA, callback)
{
    console.log(message);
    var world = message.world_id;
    var zone = message.zone_id;

    console.log('================ ENDING ALERT #'+resultID+' - World: '+world+' - Zone: '+zone+' ================');

    var returned = true;
    if (resultID)
    {
        var date = new Date();

        var datetime = DateCalc(date);

        if ((!message.end_time) || (message.end_time == "0"))  // If time is empty, use the current datetime as a backup
        {
            var newDate = new Date().getTime();
            message.end_time = parseInt(newDate / 1000);
        }

        /* Alert Processing */

        dbConnectionA.query("SELECT * FROM ws_map WHERE resultID="+resultID+" ORDER BY timestamp DESC LIMIT 1", function(err, Lresult)
        {
            if (err)
            {
                throw(err);
            }
            else
            {
                dbConnectionA.query("SELECT * FROM ws_map WHERE resultID="+resultID+" ORDER BY timestamp ASC LIMIT 1", function(err, Fresult)
                {
                    if (err)
                    {
                        throw(err);
                    }

                    if ((Fresult[0]) && (Lresult[0])) // If results have been pulled
                    {
                        calcWinners(message, resultID, Lresult, Fresult, dbConnectionA, function(winner, draw, domination)
                        {
                            if (winner) // If the winner was actually calculated
                            {
                                console.log(success("WINNER IS: "+winner));

                                dbConnectionA.query('UPDATE ws_results SET ResultDateTime="'+datetime+'", InProgress="0", Valid="1", ResultEndTime="'+message.end_time+'", ResultWinner="'+winner+'", ResultDomination="'+domination+'", ResultDraw="'+draw+'" WHERE ResultID='+resultID, function(err, result)
                                {
                                    console.log("UPDATING RESULT RECORD #"+resultID);

                                    if (err)
                                    {
                                        reportError(err, "End Result (Update)");
                                        throw(err);
                                    }
                                    else if (result.affectedRows === 0) // if it failed
                                    {
                                        throw("UPDATING ALERT RECORD FAILED! #"+resultID);
                                    }
                                    else
                                    {
                                        console.log(success("RECORD UPDATED"));
                                        console.log("DELETING INSTANCE RECORD #"+resultID);

                                        dbConnectionA.query('DELETE FROM ws_instances WHERE resultID='+resultID, function(err, result)
                                        {
                                            if (err)
                                            {
                                                reportError(err, "Delete Instance");
                                                throw(err);
                                            }
                                            else
                                            {
                                                console.log(success("INSTANCE DATABASE RECORD SUCCESSFULLY DELETED"));

                                                if (instances[resultID] !== undefined)
                                                {
                                                    var toSend =
                                                    {
                                                        "resultID": resultID,
                                                        "endTime": message.end_time,
                                                        "winner": winner,
                                                        "controlVS": instances[resultID].controlVS,
                                                        "controlNC": instances[resultID].controlNC,
                                                        "controlTR": instances[resultID].controlTR,
                                                        "domination": domination,
                                                        "world": world,
                                                        "zone": zone
                                                    };
                                                    console.log(notice("Websocket Message: ")+toSend);

                                                    sendMonitor("alertEnd", toSend);
                                                    sendResult("alertEnd", toSend, resultID);

                                                    //fireSubscriptions(message, resultID, "unsubscribe");
                                                }
                                                else
                                                {
                                                    reportError("INSTANCE COULD NOT BE DETECTED FOR ENDING ALERT: "+resultID, "End Alert");
                                                }

                                                delete populationInstances[resultID];
                                                delete instances[resultID];

                                                callback(resultID);
                                            }
                                        });
                                    }
                                });
                            }
                            else
                            {
                                console.log(critical("UNABLE TO CALCULATE WINNER!"));
                                console.log("RESULT ID: "+resultID);
                                reportError("UNABLE TO CALCULATE WINNER: "+resultID, message);
                                resetScript();
                                return false;
                            }
                        });
                    } else {
                        reportError("MISSING CAPTURE LOGS. UNABLE TO CALCULATE END OF ALERT #"+resultID, "End Alert");

                        console.log(critical("Marking Alert as Invalid"));

                        dbConnectionA.query('UPDATE ws_results SET Valid = 0, InProgress = 0 WHERE ResultID = '+resultID, function(err) {
                            if (err) { throw (err); }

                            dbConnectionA.query('DELETE FROM ws_instances WHERE resultID = '+resultID, function(err) {
                                if (err) { throw (err); }

                                delete populationInstances[resultID];
                                delete instances[resultID];
                                return false;
                            });
                        });
                    }
                });
            }
        });
    } else {
        reportError("RESULT ID WAS NOT PASSED TO END ALERT SCRIPT", "End Alert");
    }
}

function updateAlert(message, resultID, callback)
{
    var returned = true;
    if (resultID)
    {
        pool.getConnection(function(poolErr, dbConnectionMap)
        {
            if (poolErr)
            {
                throw(poolErr);
            }
            updateMapData(message, resultID, 0, dbConnectionMap, function()
            {
                dbConnectionMap.release();
            });
        });
    }
}

function updateMapData(message, resultID, insert, dbConnectionMap, callback)
{
    if (message.facility_id && message.is_block_update === "0") // If Valid
    {
        if (config.debug.facility === true) {
            console.log(notice(JSON.stringify(message, null, 4)));
        }

        var defence = 0;

        if (message.is_capture === "0")
        {
            defence = 1;
            console.log("DEFENCE!");
        }

        console.log('================ UPDATING ALERT MAP #'+resultID+' ================');

        //console.log(notice("INSERT 0"));
        var post =
        {
            resultID: resultID,
            timestamp: message.timestamp,
            facilityID: message.facility_id,
            facilityOwner: message.new_faction_id,
            facilityOldOwner: message.old_faction_id,
            controlVS: message.control_vs,
            controlNC: message.control_nc,
            controlTR: message.control_tr,
            durationHeld: message.duration_held,
            defence: defence,
            zone: message.zone_id,
            world: message.world_id,
            outfitCaptured: message.outfit_id
        };

        sendResult("facility", post, resultID);
        sendMonitor("update", post);

        dbConnectionMap.query('INSERT INTO ws_map SET ?', post, function(err, result)
        {
            if (err)
            {
                if (err.errno !== 1062) // If not a duplicate
                {
                    console.log(message);
                    reportError(err, "Insert Capture Record");
                    throw(err);
                }

                console.log(warning("DUPLICATE MAP RECORD DETECTED, SKIPPING ENTRY!"));
            }
            else
            {
                var world = message.world_id;
                var zone = message.zone_id;

                if (instances[resultID] !== undefined)
                {
                    instances[resultID].controlVS = message.control_vs;
                    instances[resultID].controlNC = message.control_nc;
                    instances[resultID].controlTR = message.control_tr;

                    if (defence === 0)
                    {
                        var instancesPost =
                        {
                            controlVS: message.control_vs,
                            controlNC: message.control_nc,
                            controlTR: message.control_tr
                        };

                        dbConnectionMap.query("UPDATE ws_instances SET ? WHERE resultID = "+resultID, instancesPost, function(err, result)
                        {
                            if (err)
                            {
                                throw(err);
                            }
                        });

                        if (message.outfit_id > 0) {

                            dbConnectionMap.query("UPDATE ws_outfits_total SET outfitCaptures=outfitCaptures+1 WHERE outfitID = '"+message.outfit_id+"'", function(err, result)
                            {
                                if (err)
                                {
                                    throw(err);
                                }

                                console.log("Incremented Outfit Captures");
                            });
                        }

                    }

                    console.log(success("FACILITY / TERRITORY RECORD INSERTED FOR WORLD: "+supplementalConfig.worlds[message.world_id]+" - ZONE: "+message.zone_id));
                    console.log(notice("New Control Percentages: ")+"VS: "+message.control_vs+"% - NC: "+message.control_nc+"% - TR: "+message.control_tr+"%");
                }
                else
                {
                    reportError("MISSING INSTANCE FOR MAP UPDATE!!!", "Update Map");
                }

                callback();
            }
        });
    }
}

function combatParse(message, resultID, dbConnectionCache)
{
    var killerID        = message.attacker_character_id;
    var victimID        = message.victim_character_id;
    var killerOutfit    = message.attacker_outfit_id;
    var victimOutfit    = message.victim_outfit_id;
    var killerName      = message.attacker_character_name;
    var victimName      = message.victim_character_name;
    var attackerFaction = message.attacker_faction_id;
    var victimFaction   = message.victim_faction_id;
    var suicide = 0;
    var teamKill = 0;

    messagesRecieved++;
    messagesRecievedSec++;

    if (message.attacker_faction_id == message.victim_faction_id) // If a TK
    {
        teamKill = 1;
    }

    if (killerID == victimID)
    {
        suicide = 1;
        teamKill = 0;
    }

    if (config.debug.combat === true)
    {
        console.log('================ INSERTING COMBAT RECORD ================');
    }

    // ATTEMPT TO GET CHARACTER NAME IF MISSING

    checkPlayerCache(killerID, message.world_id, dbConnectionCache, function(killerName)
    {
        if (config.debug.combat === true)
        {
            console.log("GOT NAME: "+killerName);
        }

        if (killerName === false)
        {
            killerName = message.attacker_character_name;
        }

        checkPlayerCache(victimID, message.world_id, dbConnectionCache, function(victimName)
        {
            if (config.debug.combat === true)
            {
                console.log("GOT NAME: "+victimName);
            }

            if (victimName === false)
            {
                victimName = message.victim_character_name;
            }

            if (!killerName || !victimName)
            {
                console.log(notice("Missing player names for combat event. Cancelling operations."));
            }

            if (killerOutfit == "0")
            {
                if (attackerFaction == "1")
                {
                    killerOutfit = "-1";
                }

                if (attackerFaction == "2")
                {
                    killerOutfit = "-2";
                }

                if (attackerFaction == "3")
                {
                    killerOutfit = "-3";
                }
            }

            if (victimOutfit == "0")
            {
                if (victimFaction == "1")
                {
                    victimOutfit = "-1";
                }

                if (victimFaction == "2")
                {
                    victimOutfit = "-2";
                }

                if (victimFaction == "3")
                {
                    victimOutfit = "-3";
                }
            }

            var combatArray =
            {
                timestamp: message.timestamp,
                resultID: resultID,
                attackerID: killerID,
                attackerName: killerName,
                attackerOutfit: killerOutfit,
                attackerFaction: message.attacker_faction_id,
                attackerLoadout: message.attacker_loadout_id,
                victimID: victimID,
                victimName: victimName,
                victimOutfit: victimOutfit,
                victimFaction: message.victim_faction_id,
                victimLoadout: message.victim_loadout_id,
                weaponID: message.weapon_id,
                vehicleID: message.vehicle_id,
                headshot: message.is_headshot,
                zone: message.zone_id,
                worldID: message.world_id,
                teamkill: teamKill,
                suicide: suicide,
            };

            if (config.debug.combat === true)
            {
                console.log(critical("===== ORIGINAL MESSAGE: ======="));
                console.log(critical(JSON.stringify(message, null, 4)));
                console.log("Combat Object Built");
                console.log(warning(JSON.stringify(combatArray, null, 4)));
            }

            checkOutfitCache(message.attacker_outfit_id, message.world_id, dbConnectionCache, function(aoutfitName, aoutfitTag, aoutfitFaction, aoutfitID)
            {
                combatArray.aOutfit = {};

                if (aoutfitName != undefined) // If returned
                {
                    combatArray.aOutfit = {};
                    combatArray.aOutfit.id = aoutfitID;
                    combatArray.aOutfit.name = aoutfitName;
                    combatArray.aOutfit.tag = aoutfitTag;
                    combatArray.aOutfit.faction = aoutfitFaction;
                }
                else
                {
                    combatArray.aOutfit = {};
                    combatArray.aOutfit.id = "0";
                    combatArray.aOutfit.name = "No Outfit";
                    combatArray.aOutfit.tag = "";
                    combatArray.aOutfit.faction = "0";
                }

                if (config.debug.combat === true)
                {
                    console.log("Attacker Outfit Object Built");
                }

                checkOutfitCache(message.victim_outfit_id, message.world_id, dbConnectionCache, function(voutfitName, voutfitTag, voutfitFaction, voutfitID)
                {
                    if (voutfitName != undefined) // If returned
                    {
                        combatArray.vOutfit = {};
                        combatArray.vOutfit.id = voutfitID;
                        combatArray.vOutfit.name = voutfitName;
                        combatArray.vOutfit.tag = voutfitTag;
                        combatArray.vOutfit.faction = voutfitFaction;
                    }
                    else
                    {
                        combatArray.vOutfit = {};
                        combatArray.vOutfit.id = "0";
                        combatArray.vOutfit.name = "No Outfit";
                        combatArray.vOutfit.tag = "";
                        combatArray.vOutfit.faction = "0";
                    }

                    pool.getConnection(function(poolErr, dbConnectionC)
                    {
                        if (poolErr)
                        {
                            throw(poolErr);
                        }

                        if (config.debug.combat === true)
                        {
                            console.log("Victim Outfit Object Built");
                        }

                        sendResult("combat", combatArray, resultID);

                        insertCombatRecord(message, resultID, combatArray, dbConnectionC, function()
                        {
                            if(config.debug.combat === true)
                            {
                                console.log("INSERTED COMBAT RECORD");
                            }

                            dbConnectionC.release();
                        });
                    });
                });
            });
        });
    });

    addKillMonitor(killerID, victimID, "kill", message.timestamp, message.vehicle_id, 0, resultID, killerName, victimName);
}

function insertCombatRecord(message, resultID, combatArray, dbConnectionC, callback)
{
    if(resultID) // Make sure result ID is valid first
    {
        var postArray =
        {
            timestamp: message.timestamp,
            resultID: resultID,
            attackerID: combatArray.attackerID,
            attackerName: combatArray.attackerName,
            attackerOutfit: combatArray.attackerOutfit,
            attackerFaction: combatArray.attackerFaction,
            attackerLoadout: combatArray.attackerLoadout,
            victimID: combatArray.victimID,
            victimName: combatArray.victimName,
            victimOutfit: combatArray.victimOutfit,
            victimFaction: combatArray.victimFaction,
            victimLoadout: combatArray.victimLoadout,
            weaponID: combatArray.weaponID,
            vehicleID: combatArray.vehicleID,
            headshot: combatArray.headshot,
            zone: combatArray.zone,
            worldID: combatArray.worldID,
            teamkill: combatArray.teamkill,
            suicide: combatArray.suicide,
        };

        if (config.debug.combat === true)
        {
            console.log("Post array built");
            console.log(warning(JSON.stringify(postArray, null, 4)));
        }

        pool.getConnection(function(poolErr, dbConnectionW)
        {
            if (poolErr)
            {
                throw(poolErr);
            }

            insertWeaponStats(message, resultID, combatArray, dbConnectionW);
            dbConnectionW.release();
        });

        pool.getConnection(function(poolErr, dbConnectionO)
        {
            if (poolErr)
            {
                throw(poolErr);
            }

            insertOutfitStats(message, resultID, combatArray, dbConnectionO);
            dbConnectionO.release();
        });

        pool.getConnection(function(poolErr, dbConnectionP)
        {
            if (poolErr)
            {
                throw(poolErr);
            }

            insertPlayerStats(message, resultID, combatArray, dbConnectionP);
            dbConnectionP.release();
        });

        pool.getConnection(function(poolErr, dbConnectionF)
        {
            if (poolErr)
            {
                throw(poolErr);
            }

            updateFactionStats(message, resultID, combatArray, dbConnectionF);
            dbConnectionF.release();
        });

        if (config.toggles.classStats === true)
        {
            pool.getConnection(function(poolErr, dbConnectionClass)
            {
                if (poolErr)
                {
                    throw(poolErr);
                }

                insertClassStats(message, resultID, combatArray, dbConnectionClass, function()
                {
                    dbConnectionClass.release();
                });
            });
        }

        if (config.debug.combat === true)
        {
            console.log(success("PROCESSED KILL FOR PLAYER: "+message.attacker_character_name+" - "+supplementalConfig.worlds[message.world_id]));
            console.log(notice("Player used weapon: "+message.weapon_id));
        }

        callback();
    }
    else
    {
        console.log(critical("NO VALID RESULT ID FOUND! - insertCombatRecord"));
    }
}

function insertWeaponStats(message, resultID, combatArray, dbConnectionW)
{
    var kill = 'killCount=killCount+1';
    var headshot = '';
    var teamkill = '';

    if (combatArray.teamkill == "1")
    {
        kill = '';
        teamkill = 'teamkills=teamkills+1';
    }

    if (combatArray.headshot == "1")
    {
        headshot = ', headshots=headshots+1';
    }

    var updateWeaponTotalsQuery = 'UPDATE ws_weapons_totals SET '+kill+teamkill+headshot+' WHERE weaponID="'+message.weapon_id+'" AND resultID='+resultID;
    var updateWeaponPlayerQuery = 'UPDATE ws_weapons SET '+kill+teamkill+headshot+' WHERE weaponID="'+message.weapon_id+'" AND playerID="'+message.attacker_character_id+'" AND resultID='+resultID;

    dbConnectionW.query(updateWeaponTotalsQuery, function(err, result)
    {
        if (err)
        {
            reportError(err, "Update Weapon Stats Totals");
            console.log(message.weapon_id);
            console.log(resultID);
            console.log(critical(updateWeaponTotalsQuery));
            throw(err);
        }
        else
        {
            var numTRows = result.affectedRows;

            var killInt = 1;

            if (combatArray.teamkill == 1) {
                killInt = 0;
            }

            if (numTRows === 0)
            {
                var weaponTArray = {
                    resultID: resultID,
                    weaponID: message.weapon_id,
                    killCount: killInt,
                    headshots: combatArray.headshot,
                    teamkills: combatArray.teamkill
                };

                dbConnectionW.query('INSERT INTO ws_weapons_totals SET ?', weaponTArray, function(err, result)
                {
                    if (err)
                    {
                        if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                        {
                            reportError(err, "Insert Weapon Stats Totals - Deadlock");
                            console.log(weaponTArray);
                        }
                        else if (err.errno === 1062) // If a duplicate
                        {
                            if (config.debug.databaseWarnings === true)
                            {
                                console.log(warning("DUPLICATE WEAPON TOTAL STAT DETECTED - " + message.weapon_id + " #"+ resultID));
                                console.log(warning(err));
                            }

                            handleDeadlock(updateWeaponTotalsQuery, "Weapons Totals", 0);
                        }
                    }
                });
            }

            dbConnectionW.query(updateWeaponPlayerQuery, function(err, result)
            {
                if (err)
                {
                    reportError(err, "Update Weapon Stats Killer");
                    throw(err);
                }
                else
                {
                    var numRows = result.affectedRows;

                    if (numRows === 0) // If new record
                    {
                        var weaponArray = {
                            resultID: resultID,
                            playerID: message.attacker_character_id,
                            weaponID: message.weapon_id,
                            killCount: killInt,
                            headshots: combatArray.headshot,
                            teamkills: combatArray.teamkill
                        };

                        if (config.debug.wepaons === true)
                        {
                            console.log(weaponArray);
                        }

                        dbConnectionW.query('INSERT INTO ws_weapons SET ?', weaponArray, function(err, result)
                        {
                            if (err)
                            {
                                if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                                {
                                    reportError(err, "Insert Weapon Stats");
                                    console.log(weaponArray);
                                }
                                else
                                {
                                    if (config.debug.databaseWarnings === true)
                                    {
                                        console.log(warning(err));
                                        console.log(warning("DUPLICATE WEAPON STAT DETECTED - Weapon: " +message.weapon_id + " - #"+resultID));
                                    }

                                    if (config.debug.databaseQuries === true) {
                                        console.log(updateWeaponPlayerQuery);
                                    }

                                    handleDeadlock(updateWeaponPlayerQuery, "Weapons Insert", 0);
                                }
                            }
                        });
                    }
                }
            });
        }
    });
}

function insertOutfitStats(message, resultID, combatArray, dbConnectionO)
{
    var killOutfit = combatArray.attackerOutfit;
    var deathOutfit = combatArray.victimOutfit;
    var numRowsKills = 0;
    var numRowsDeaths = 0;
    var attackerID = combatArray.attackerID;
    var victimID = combatArray.victimID;
    var attackerFaction = combatArray.attackerFaction;
    var victimFaction = combatArray.victimFaction;
    var worldID = combatArray.worldID;

    if (outfitTotalsUpdates[resultID] === undefined)
    {
        outfitTotalsUpdates[resultID] = {};
    }

    if (outfitTotalsUpdates[resultID][killOutfit] === undefined)
    {
        outfitTotalsUpdates[resultID][killOutfit] =
        {
            outfitKills: 0,
            outfitDeaths: 0,
            outfitTKs: 0,
            outfitSuicides: 0,
            world: worldID,
            outfitName: combatArray.aOutfit.name,
            outfitTag: combatArray.aOutfit.tag,
            outfitFaction: combatArray.attackerFaction,
        };
    }
    if (outfitTotalsUpdates[resultID][deathOutfit] === undefined)
    {
        outfitTotalsUpdates[resultID][deathOutfit] =
        {
            outfitKills: 0,
            outfitDeaths: 0,
            outfitTKs: 0,
            outfitSuicides: 0,
            world: worldID,
            outfitName: combatArray.vOutfit.name,
            outfitTag: combatArray.vOutfit.tag,
            outfitFaction: combatArray.victimFaction,
        };
    }

    if (combatArray.teamkill == 1) // TK
    {
        outfitTotalsUpdates[resultID][killOutfit].outfitTKs++;
        outfitTotalsUpdates[resultID][deathOutfit].outfitDeaths++;
    }
    else if (combatArray.suicide == 1) // If a suicide
    {
        outfitTotalsUpdates[resultID][deathOutfit].outfitDeaths++;
        outfitTotalsUpdates[resultID][deathOutfit].outfitSuicides++;
    }
    else // Normal kill
    {
        outfitTotalsUpdates[resultID][killOutfit].outfitKills++;
        outfitTotalsUpdates[resultID][deathOutfit].outfitDeaths++;
    }
}

function insertPlayerStats(message, resultID, combatArray, dbConnectionP)
{
    var attackerID = combatArray.attackerID;
    var victimID = combatArray.victimID;
    var attackerOutfit = combatArray.attackerOutfit;
    var victimOutfit = combatArray.victimOutfit;
    var attackerFID = combatArray.attackerFaction;
    var victimFID = combatArray.victimFaction;
    var attackerName = combatArray.attackerName;
    var victimName = combatArray.victimName;
    var timestamp = combatArray.timestamp;
    var headshot = combatArray.headshot;
    var worldID = combatArray.worldID;

    /* If the names are missing, resolve them manually */

    var teamKill = 0;
    var numRowsKills = 0;
    var numRowsDeaths = 0;
    var suicide = 0;

    var aKillQuery = 'playerKills=playerKills+1';
    var aDeathQuery = '';
    var aTKQuery = '';
    var aSuicideQuery = '';
    var headshotQuery = '';

    var vDeathQuery = 'playerDeaths=playerDeaths+1';

    if (combatArray.headshot == "1")
    {
        aKillQuery = 'playerKills=playerKills+1, ';
        headshotQuery = 'headshots=headshots+1';
    }

    if (combatArray.teamkill == "1") // If a TK
    {
        aKillQuery = '';
        teamKill = 1;
        aTKQuery = 'playerTeamKills=playerTeamKills+1';

        if (config.debug.combat === true)
        {
            console.log("TEAM KILL - Player");
        }

        if (combatArray.headshot == "1")
        {
            headshotQuery = 'headshots=headshots+1, ';
        }
    }
    else if (combatArray.suicide == "1") // Is it a suicie?
    {
        aKillQuery = '';
        aDeathQuery = 'playerDeaths=playerDeaths+1, ';
        aSuicideQuery = 'playerSuicides=playerSuicides+1';
        vDeathQuery = '';
        suicide = 1;

        if (config.debug.combat === true)
        {
            console.log("SUICIDE - Player");
        }
    }

    var playerKills = 1;
    var playerDeaths = 0;

    if (teamKill == "1")
    {
        playerKills = 0;
    }

    if (suicide == "1")
    {
        playerDeaths = 1;
        playerKills = 0;
    }

    var updateQuery = 'UPDATE ws_players SET '+aKillQuery+''+headshotQuery+''+aDeathQuery+''+aSuicideQuery+''+aTKQuery+' WHERE playerID="'+attackerID+'" AND resultID='+resultID;

    if (config.debug.combat === true)
    {
        console.log(critical(updateQuery));
    }

    dbConnectionP.query(updateQuery, function(err, resultA)
    {
        if (err)
        {
            console.log(critical(updateQuery));
            reportError(err, "Update Player Kills");
            throw(err);
        }
        else
        {
            if (resultA.affectedRows === 0) // If new record for Attacker
            {
                var playerArrayKills = {
                    resultID: resultID,
                    playerID: attackerID,
                    playerName: attackerName,
                    playerOutfit: attackerOutfit,
                    playerFaction: attackerFID,
                    playerKills: playerKills,
                    playerDeaths: playerDeaths,
                    playerTeamKills: teamKill,
                    playerSuicides: suicide,
                    headshots: headshot,
                };

                dbConnectionP.query('INSERT INTO ws_players SET ?', playerArrayKills, function(err, result)
                {
                    if (err)
                    {
                        if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                        {
                            reportError(err, "Insert Initial Player Kill Stats");
                        }
                        else
                        {
                            if (config.debug.duplicates === true)
                            {
                                console.log(warning("DUPLICATED / DEADLOCK PLAYER DEATH RECORD DETECTED"));
                                reportError(err, "Insert Players Attacker Duplicated");
                            }

                            handleDeadlock(updateQuery, "Insert Attacker", 0);
                        }
                    }
                });
            }

            var updateTotalQuery = 'UPDATE ws_players_total SET playerServer = '+worldID+', '+aKillQuery+''+headshotQuery+''+aDeathQuery+''+aSuicideQuery+''+aTKQuery+' WHERE playerID="'+attackerID+'"';

            dbConnectionP.query(updateTotalQuery, function(err, resultB)
            {
                if(err)
                {
                    throw(err);
                }

                if (resultB.affectedRows === 0) // If new record for Attacker
                {
                    var playerArrayTotal = {
                        playerID: attackerID,
                        playerName: attackerName,
                        playerOutfit: attackerOutfit,
                        playerFaction: attackerFID,
                        playerKills: playerKills,
                        playerDeaths: playerDeaths,
                        playerTeamKills: teamKill,
                        playerSuicides: suicide,
                        headshots: headshot,
                        playerServer: worldID
                    };

                    dbConnectionP.query('INSERT INTO ws_players_total SET ?', playerArrayTotal, function(err, result)
                    {
                        if(err)
                        {
                            if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                            {
                                reportError(err, "Insert Initial Player Total Stats (Attacker)", 0);
                            }
                            else
                            {
                                handleDeadlock(updateTotalQuery, "Insert Initial Player Total Stats (attacker)");
                            }
                        }
                    });
                }
            });

            if (attackerID != victimID) // Don't count them twice!
            {
                var victimUpdateQuery = 'UPDATE ws_players SET '+vDeathQuery+' WHERE playerID="'+victimID+'" AND resultID='+resultID;

                if (config.debug.combat === true)
                {
                    console.log(critical(victimUpdateQuery));
                }

                dbConnectionP.query(victimUpdateQuery, function(err, resultR)
                {
                    if (err)
                    {
                        reportError(err, "Update Player Deaths");
                        throw(err);
                    }
                    else
                    {
                        // PROCESSING FOR IF UPDATES FAILED (aka NEW RECORD)

                        if (resultR.affectedRows === 0) // If new record for Victim
                        {
                            var playerArrayDeaths = {
                                resultID: resultID,
                                playerID: victimID,
                                playerOutfit: victimOutfit,
                                playerName: victimName,
                                playerFaction: victimFID,
                                playerKills: 0,
                                playerDeaths: 1,
                                playerTeamKills: 0,
                                playerSuicides: 0,
                                headshots: 0,
                            };

                            dbConnectionP.query('INSERT INTO ws_players SET ?', playerArrayDeaths, function(err, result)
                            {
                                if (err)
                                {
                                    if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                                    {
                                        reportError(err, "Insert Initial Player Death Stats");
                                    }
                                    else
                                    {
                                        if (config.debug.duplicates === true)
                                        {
                                            console.log(warning("DUPLICATED PLAYER DEATH RECORD DETECTED"));
                                        }

                                        handleDeadlock(victimUpdateQuery, "Insert Player Death", 0);
                                    }
                                }
                            });
                        }
                    }
                });

                var victimTotalQuery = 'UPDATE ws_players_total SET '+vDeathQuery+' WHERE playerID="'+victimID+'"';

                dbConnectionP.query(victimTotalQuery, function(err, resultC)
                {
                    if(err)
                    {
                        throw(err);
                    }

                    if (resultC.affectedRows === 0) // If new record for Attacker
                    {
                        var playerArrayTotal = {
                            playerID: victimID,
                            playerName: victimName,
                            playerOutfit: victimOutfit,
                            playerFaction: attackerFID,
                            playerKills: 0,
                            playerDeaths: 1,
                            playerTeamKills: 0,
                            playerSuicides: 0,
                            headshots: 0,
                        };

                        dbConnectionP.query('INSERT INTO ws_players_total SET ?', playerArrayTotal, function(err, result)
                        {
                            if(err)
                            {
                                if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                                {
                                    reportError(err, "Insert Initial Player Total Death Stats");
                                }
                                else
                                {
                                    handleDeadlock(victimUpdateQuery, "Insert Initial Player Total Death Stats");
                                }
                            }
                        });
                    }
                });
            }
            else
            {
                if (config.debug.combat === true)
                {
                    console.log("Attacker and Victim IDs are the same.");
                }
            }
        }
    });
}

var factionUpdates = {};
var xpTotalsUpdates = {};
var outfitTotalsUpdates = {};
var classTotalsUpdates = {};
var classPlayerUpdates = {};

setInterval(function()
{
    batchUpdateFactionStats(function()
    {
    });

    batchUpdateXpTotals(function()
    {
    });

    batchUpdateOutfitTotals(function()
    {
    });

    batchUpdateClassTotals(function()
    {
    });
}, 5000);

function batchUpdateFactionStats(callback)
{
    pool.getConnection(function(poolErr, dbFactionUpdate)
    {
        if (poolErr)
        {
            throw(poolErr);
        }

        Object.keys(factionUpdates).forEach(function(key)
        {
            var object = clone(factionUpdates[key]); // The result object
            delete factionUpdates[key];

            if (config.debug.batch === true)
            {
                console.log(JSON.stringify(object, null, 4));
            }

            pool.query("UPDATE ws_factions SET killsVS=killsVS+"+object.killsVS+", killsNC=killsNC+"+object.killsNC+", killsTR=killsTR+"+object.killsTR+", deathsVS=deathsVS+"+object.deathsVS+", deathsNC=deathsNC+"+object.deathsNC+", deathsTR=deathsTR+"+object.deathsTR+", teamKillsVS=teamKillsVS+"+object.teamKillsVS+", teamKillsNC=teamKillsNC+"+object.teamKillsNC+", teamKillsTR=teamKillsTR+"+object.teamKillsTR+", suicidesVS=suicidesVS+"+object.suicidesVS+", suicidesNC=suicidesNC+"+object.suicidesNC+", suicidesTR=suicidesTR+"+object.suicidesTR+", totalKills=totalKills+"+object.totalKills+", totalDeaths=totalDeaths+"+object.totalDeaths+", totalTKs=totalTKs+"+object.totalTKs+", totalSuicides=totalSuicides+"+object.totalSuicides+" WHERE resultID = "+key, function(err, result)
            {
                if (err)
                {
                    throw(err);
                }
            });
        });

        if (config.debug.batch === true)
        {
            console.log(success("BATCH UPDATE FOR ALERTS COMPLETE"));
        }

        dbFactionUpdate.release();
        callback();
    });
}

function batchUpdateXpTotals(callback)
{
    pool.getConnection(function(poolErr, dbXPUpdate)
    {
        if (poolErr)
        {
            throw(poolErr);
        }

        Object.keys(xpTotalsUpdates).forEach(function(xpType)
        {
            var object = clone(xpTotalsUpdates);

            var updateTotalsQuery = 'UPDATE ws_xp_totals SET occurances=occurances+'+object[xpType]+' WHERE type = '+xpType;

            if (config.debug.batch === true)
            {
                console.log(updateTotalsQuery);
            }

            dbXPUpdate.query(updateTotalsQuery, function(err, result)
            {
                if (err)
                {
                    if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                    {
                        handleDeadlock(updateTotalsQuery, "XP Update Totals", 0);
                    }
                    else if (err)
                    {
                        reportError(err, "Unable to update XP totals record");
                        throw(err);
                    }
                }
                else if (result.affectedRows === 0) // If missing record
                {
                    console.log(notice("INSERTING XP TOTALS RECORD"));
                    var xpArrayTotals =
                    {
                        type: xpType,
                        occurances: 1
                    };

                    dbXPUpdate.query('INSERT INTO ws_xp_totals SET ?', xpArrayTotals, function(err, result)
                    {
                        if (err)
                        {
                            if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                            {
                                reportError(err, "Insert XP Stats record Totals (#"+resultID+")");
                            }
                            else
                            {
                                handleDeadlock(updateTotalsQuery, "XP Update", 0);
                            }
                        }
                    });
                }
            });
        });

        dbXPUpdate.release();
        callback();
    });
}

function batchUpdateOutfitTotals(callback)
{
    pool.getConnection(function(poolErr, dbOutfitUpdate)
    {
        if (poolErr)
        {
            throw(poolErr);
        }

        Object.keys(outfitTotalsUpdates).forEach(function(resultID)
        {
            Object.keys(outfitTotalsUpdates[resultID]).forEach(function(outfitID)
            {
                var object = clone(outfitTotalsUpdates[resultID][outfitID]);
                delete outfitTotalsUpdates[resultID][outfitID];

                var updateOutfitAlert = 'UPDATE ws_outfits SET outfitKills=outfitKills+'+object.outfitKills+', outfitDeaths=outfitDeaths+'+object.outfitDeaths+',outfitTKs=outfitTKs+'+object.outfitTKs+', outfitSuicides=outfitSuicides+'+object.outfitSuicides+' WHERE outfitID = "'+outfitID+'" AND resultID = '+resultID;

                var updateOutfitTotals = 'UPDATE ws_outfits_total SET outfitKills=outfitKills+'+object.outfitKills+', outfitDeaths=outfitDeaths+'+object.outfitDeaths+',outfitTKs=outfitTKs+'+object.outfitTKs+', outfitSuicides=outfitSuicides+'+object.outfitSuicides+' WHERE outfitID = "'+outfitID+'"';

                dbOutfitUpdate.query(updateOutfitAlert, function(err, resultA)
                {
                    if (err)
                    {
                        reportError(err, "Update Outfit Kills");
                        throw(err);
                    }

                    if (resultA.affectedRows === 0)
                    {
                        var outfitArrayKills = {
                            resultID: resultID,
                            outfitID: outfitID,
                            outfitName: object.outfitName,
                            outfitTag: object.outfitTag,
                            outfitFaction: object.outfitFaction,
                            outfitKills: object.outfitKills,
                            outfitDeaths: object.outfitDeaths,
                            outfitSuicides: object.outfitSuicides,
                            outfitTKs: object.outfitTKs
                        };

                        dbOutfitUpdate.query('INSERT INTO ws_outfits SET ?', outfitArrayKills, function(err, result)
                        {
                            if (err)
                            {
                                if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                                {
                                    reportError(err, "Insert Outfit Stats");
                                }
                                else
                                {
                                    handleDeadlock(updateOutfitAlert, "Insert outfit stats");
                                }
                            }
                        });
                    }

                    // OUTFIT TOTALS

                    dbOutfitUpdate.query(updateOutfitTotals, function(err, resultB)
                    {
                        if(err)
                        {
                            throw(err);
                        }

                        if (resultB.affectedRows === 0) // If new record for Attacker
                        {
                            var outfitArrayKills = {
                                outfitID: outfitID,
                                outfitName: object.outfitName,
                                outfitTag: object.outfitTag,
                                outfitFaction: object.outfitFaction,
                                outfitKills: object.outfitKills,
                                outfitDeaths: object.outfitDeaths,
                                outfitSuicides: object.outfitSuicides,
                                outfitTKs: object.outfitTKs,
                                outfitServer: object.world,
                            };

                            dbOutfitUpdate.query('INSERT INTO ws_outfits_total SET ?', outfitArrayKills, function(err, result)
                            {
                                if(err)
                                {
                                    if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                                    {
                                        reportError(err, "Insert Initial Outfit Total Stats (Attacker)");
                                    }
                                    else
                                    {
                                        handleDeadlock(updateOutfitTotals, "Insert initial outfit total stats (attacker)");
                                    }
                                }
                            });
                        }
                    });
                });
            });
        });

        dbOutfitUpdate.release();
        callback();
    });
}

function batchUpdateClassTotals(callback)
{
    pool.getConnection(function(poolErr, dbClassUpdate)
    {
        if (poolErr)
        {
            throw(poolErr);
        }

        Object.keys(classTotalsUpdates).forEach(function(resultID)
        {
            Object.keys(classTotalsUpdates[resultID]).forEach(function(classID)
            {
                var object = clone(classTotalsUpdates[resultID][classID]);
                delete classTotalsUpdates[resultID][classID];

                var updateLoadoutQuery = 'UPDATE ws_classes SET kills=kills+'+object.kills+', deaths=deaths+'+object.deaths+', teamkills=teamkills+'+object.teamkills+', suicides=suicides+'+object.suicides+' WHERE resultID = '+resultID+' AND classID = '+classID;

                dbClassUpdate.query(updateLoadoutQuery, function(err, result)
                {
                    if (err)
                    {
                        if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                        {
                            reportError(err, "Unable to update class row");
                        }
                        else if (err)
                        {
                            handleDeadlock(updateLoadoutQuery, "Class Attacker Update", 0);
                        }
                    }
                    else if (result.affectedRows === 0) // If missing record
                    {
                        if (config.debug.classes === true)
                        {
                            console.log(notice("INSERTING Class Attacker RECORD"));
                        }

                        var classArray =
                        {
                            resultID : resultID,
                            classID: classID,
                            kills: object.kills,
                            deaths: object.deaths,
                            teamkills: object.teamkills,
                            suicides: object.suicides
                        };

                        dbClassUpdate.query('INSERT INTO ws_classes SET ?', classArray, function(err, result)
                        {
                            if (err)
                            {
                                if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                                {
                                    reportError(err, "Unable to insert class attacker");
                                }
                                else
                                {
                                    handleDeadlock(updateLoadoutQuery, "Class attacker");
                                }
                            }
                        });
                    }
                });
            });
        });

        Object.keys(classPlayerUpdates).forEach(function(resultID)
        {
            Object.keys(classPlayerUpdates[resultID]).forEach(function(classID)
            {
                Object.keys(classPlayerUpdates[resultID][classID]).forEach(function(playerID)
                {
                    var object = clone(classPlayerUpdates[resultID][classID][playerID]);
                    delete classPlayerUpdates[resultID][classID][playerID];

                    var updatePlayerLoadoutQuery = 'UPDATE ws_classes_totals SET kills=kills+'+object.kills+', deaths=deaths+'+object.deaths+', teamkills=teamkills+'+object.teamkills+', suicides=suicides+'+object.suicides+' WHERE resultID = '+resultID+' AND classID = '+classID+' AND playerID = '+playerID;

                    dbClassUpdate.query(updatePlayerLoadoutQuery, function(err, result)
                    {
                        if (err)
                        {
                            if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                            {
                                reportError(err, "Unable to update Class Player Totals row");
                            }
                            else if (err)
                            {
                                handleDeadlock(updatePlayerLoadoutQuery, "Class Player Totals Attacker Update", 0);
                            }
                        }
                        else if (result.affectedRows === 0) // If missing record
                        {
                            if (config.debug.classes === true)
                            {
                                console.log(notice("INSERTING Class Player Totals RECORD"));
                            }

                            var classArray =
                            {
                                resultID  : resultID,
                                playerID  : playerID,
                                classID   : classID,
                                kills     : object.kills,
                                deaths    : object.deaths,
                                teamkills : object.teamkills,
                                suicides  : object.suicides
                            };

                            dbClassUpdate.query('INSERT INTO ws_classes_totals SET ?', classArray, function(err, result)
                            {
                                if (err)
                                {
                                    if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                                    {
                                        reportError(err, "Unable to insert Class Player Totals");
                                    }
                                    else
                                    {
                                        handleDeadlock(updatePlayerLoadoutQuery, "Update Player Loadout");
                                    }
                                }
                            });
                        }
                    });
                });
            });
        });

        dbClassUpdate.release();
    });

    callback();
}

function updateFactionStats(message, resultID, combatArray, dbConnectionF)
{
    var killerID = combatArray.attackerID;
    var victimID = combatArray.victimID;
    var killerFID = combatArray.attackerFaction;
    var victimFID = combatArray.victimFaction;
    var killerName = combatArray.attackerName;
    var victimName = combatArray.victimName;

    if (factionUpdates[resultID] === undefined)
    {
        factionUpdates[resultID] =
        {
            killsVS: 0,
            killsNC: 0,
            killsTR: 0,
            deathsVS: 0,
            deathsNC: 0,
            deathsTR: 0,
            teamKillsVS: 0,
            teamKillsNC: 0,
            teamKillsTR: 0,
            suicidesVS: 0,
            suicidesNC: 0,
            suicidesTR: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalTKs: 0,
            totalSuicides: 0
        };
    }

    /* If the names are missing, resolve them manually */

    if (killerFID == "1")
    {
        kFaction = "VS";
    }
    else if (killerFID == "2")
    {
        kFaction = "NC";
    }
    else if (killerFID == "3")
    {
        kFaction = "TR";
    }

    if (victimFID == "1")
    {
        vFaction = "VS";
    }
    else if (victimFID == "2")
    {
        vFaction = "NC";
    }
    else if (victimFID == "3")
    {
        vFaction = "TR";
    }

    if (combatArray.teamkill == "1") // If a TK
    {
        kField = factionUpdates[resultID]['teamKills'+kFaction]++;
        kField = factionUpdates[resultID]['deaths'+kFaction]++;
        tField = factionUpdates[resultID]['totalTKs']++;
        tField = factionUpdates[resultID]['totalDeaths']++;

        if (config.debug.combat === true)
        {
            console.log(critical("TK"));
        }
    }
    else if (combatArray.suicide == "1") // Is it a suicide?
    {
        if (killerFID == "0") // If the faction is missing, use the victim
        {
            kFaction = vFaction;
        }

        kField = factionUpdates[resultID]['suicides'+kFaction]++;
        kField = factionUpdates[resultID]['deaths'+kFaction]++;
        tField = factionUpdates[resultID]['totalSuicides']++;
        tField = factionUpdates[resultID]['totalDeaths']++;

        if (config.debug.combat === true)
        {
            console.log(warning("SUICIDE"));
        }
    }
    else // Must be a kill then
    {
        kField = factionUpdates[resultID]['kills'+kFaction]++;
        kField = factionUpdates[resultID]['deaths'+vFaction]++;
        tField = factionUpdates[resultID]['totalKills']++;
        tField = factionUpdates[resultID]['totalDeaths']++;

        if (config.debug.combat === true)
        {
            console.log(success("KILL"));
        }
    }

    if (config.debug.combat === true)
    {
        console.log(kFaction);
        console.log(vFaction);
        console.log("----");
    }

    dField = 'deaths'+vFaction;
}

/* IDs
1 = Flash
2 = Sunderer
3 = Lightning
4 = Magrider
5 = Vanguard
6 = Prowler
7 = Scythe
8 = Reaver
9 = Mozie
10 = Liberator
11 = Galaxy
12 = Harasser
13 = Drop pod
14 = Valkrye
100 = AI Base Turret
127 = AA Base Turret
101 = AI Mana Turret
102 = AV Mana Turret
150 = AA Base Turret (non tower)
151 = AV Base Turret
1012 = Phoenix Missle
*/

var vehNanite = {
    1: 50,
    2: 200,
    3: 350,
    4: 450,
    5: 450,
    6: 450,
    7: 350,
    8: 350,
    9: 350,
    10: 450,
    11: 450,
    12: 150,
    14: 250,
    101: 0,
    102: 0,
    127: 0,
    150: 0,
    151: 0,
    152: 0
};

function insertVehicleStats(message, resultID, combat, callback)
{
    if(combat === 0) // If  a combat message, ignore this shizzle.
    {
        var killerID = message.attacker_character_id;
        var victimID = message.victim_character_id;

        var killerVID = message.attacker_vehicle_id;
        var victimVID = message.victim_vehicle_id;

        addKillMonitor(killerID, victimID, "vKill", message.timestamp, killerVID, victimVID, resultID, null, null);
    }
}

function insertExperience(message, resultID, dbConnectionXP, callback)
{
    var charID = message.character_id;
    var xpType = message.experience_id;
    var xpTypeInt = parseInt(message.experience_id);
    var xpAmount = message.amount;

    /*- XP -
    2 - Assist
    3 - Kill Spawn Assist
    4 - Heal Player
    5 - Heal Assist
    6 - MAX Repair
    7 - Revive
    8 - Kill Streak
    10 - Domination Kill
    11 - Revenge Kill (Nemesis)
    15 - Control Point Defend
    16 - Control Point Attack
    25 - Multiple Kill
    26 - Road Kioll
    29 - Kill Max
    34 - Resupply
    37 - Headshot
    51 - Squad Heal
    53 - Squad Revive
    54 - Squad Spot Kill
    55 - Squad Resupply
    56 - Squad Spawn (awarded to SL)
    142 - Squad MAX Repair (character->recipient)
    270 - Spawn Beacon Kill
    272 - Convert Capture point (attacking or defending)
    275 - Terminal Desruction
    276 - Terminal Repair
    278 - High Priority Kill
    279 - Extreme Menace Kill
    293 - Motion Detect (Non squad)
    294 - Squad Motion Spot
    370 - Motion Spotter Kill
    437 - Shield bubble kill
    438 - Shield repair (character->recpient)
    439 - Squad Shield Repair (character->recpient)
    554 - Flashbang Assist
    555 - Flashbang Squad Assist
    556 - Objective Guard Bonus
    557 - Objective Capture Bonus

    7 and 53 replace each other (revives)

    5428285306548271089 - Warcore
    "5428285306548272721" - Anioth

    Repairs replace each other.
    In order to get squad repair, a member of the squad has to be inside.

    character_name for healing is the person who heals, other_character_id is the person being healed

    54 - Squad spot kill awarded to the person who spotter the victim. Killer get's normal kill

    Spawn kills don't work. The Kill event get's removed instead of sending a spawn kill event

    Extreme Menice and Menice kills are time based

    High Priority Kill = 1000XP
    Extreme Menace Kill = 2000XP

    */

    var allowedXPTypes = [4,5,6,7,8,10,11,15,16,25,26,29,26,32,34,37,51,53,54,55,56,131,132,133,134,135,136,137,138,139,140,141,142,201,236,237,240,241,270,272,275,276,277,278,279,293,294,370,437,438,439,556,557,579,584,592];

    var typeCheck = allowedXPTypes.indexOf(xpTypeInt);

    if (typeCheck != "-1")
    {
        if (xpTotalsUpdates[xpType] === undefined)
        {
            xpTotalsUpdates[xpType] = 0;
        }

        xpTotalsUpdates[xpType]++;

        var updateQuery = 'UPDATE ws_xp SET occurances=occurances+1 WHERE playerID = "'+charID+'" AND resultID = '+resultID+' AND type = '+xpType;

        dbConnectionXP.query(updateQuery, function(err, result)
        {
            if (err)
            {
                if (err.errno == 1213 || err.errno == 1062) // If deadlock
                {
                    console.log(err.errno);
                    handleDeadlock(updateQuery, "XP Update", 0);
                }
                else if (err)
                {
                    reportError(err, "Unable to update XP player record");
                    throw(err);
                }
            }
            else if (result.affectedRows === 0) // If missing record
            {
                if (config.debug.xpmessage === true)
                {
                    console.log(notice("INSERTING XP RECORD"));
                }

                var xpArray =
                {
                    playerID: charID,
                    resultID: resultID,
                    type: xpType,
                    occurances: 1
                };

                dbConnectionXP.query('INSERT INTO ws_xp SET ?', xpArray, function(err, result)
                {
                    if (err)
                    {
                        if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                        {
                            reportError(err, "Insert XP Stats record (#"+resultID+")");
                        }
                        else if (err)
                        {
                            handleDeadlock(updateQuery, "XP Update", 0);
                        }
                    }
                    else // Fire the query that was going to happen
                    {
                        dbConnectionXP.query(updateQuery);
                    }
                });
            }
        });
    }

    callback();
}

function insertClassStats(message, resultID, combatArray, dbConnectionClass, callback)
{
    var attackerLoadout = combatArray.attackerLoadout;
    var victimLoadout   = combatArray.victimLoadout;
    var attackerID      = combatArray.attackerID;
    var victimID        = combatArray.victimID;

    if (classTotalsUpdates[resultID] === undefined)
    {
        classTotalsUpdates[resultID] = {};
    }

    if (classTotalsUpdates[resultID][attackerLoadout] === undefined)
    {
        classTotalsUpdates[resultID][attackerLoadout] =
        {
            kills: 0,
            deaths: 0,
            teamkills: 0,
            suicides: 0
        };
    }

    if (classTotalsUpdates[resultID][victimLoadout] === undefined)
    {
        classTotalsUpdates[resultID][victimLoadout] =
        {
            kills: 0,
            deaths: 0,
            teamkills: 0,
            suicides: 0
        };
    }

    /** PER PLAYER CLASS STATS */

    if (classPlayerUpdates[resultID] === undefined)
    {
        classPlayerUpdates[resultID] = {};
    }

    if (classPlayerUpdates[resultID][attackerLoadout] === undefined)
    {
        classPlayerUpdates[resultID][attackerLoadout] = {};
    }

    if (classPlayerUpdates[resultID][victimLoadout] === undefined)
    {
        classPlayerUpdates[resultID][victimLoadout] = {};
    }

    if (classPlayerUpdates[resultID][attackerLoadout][attackerID] === undefined)
    {
        classPlayerUpdates[resultID][attackerLoadout][attackerID] =
        {
            kills: 0,
            deaths: 0,
            teamkills: 0,
            suicides: 0
        };
    }

    if (classPlayerUpdates[resultID][victimLoadout][victimID] === undefined)
    {
        classPlayerUpdates[resultID][victimLoadout][victimID] =
        {
            kills: 0,
            deaths: 0,
            teamkills: 0,
            suicides: 0
        };
    }

    /**  **/

    if (combatArray.teamkill == 1)
    {
        classTotalsUpdates[resultID][attackerLoadout].teamkills++;
        classTotalsUpdates[resultID][victimLoadout].deaths++;

        classPlayerUpdates[resultID][attackerLoadout][attackerID].teamkills++;
        classPlayerUpdates[resultID][victimLoadout][victimID].deaths++;
    }
    else if (combatArray.suicide == 1)
    {
        classTotalsUpdates[resultID][victimLoadout].deaths++;
        classTotalsUpdates[resultID][victimLoadout].suicides++;

        classPlayerUpdates[resultID][victimLoadout][victimID].deaths++;
        classPlayerUpdates[resultID][victimLoadout][victimID].suicides++;
    }
    else // Normal
    {
        classTotalsUpdates[resultID][attackerLoadout].kills++;
        classTotalsUpdates[resultID][victimLoadout].deaths++;

        classPlayerUpdates[resultID][attackerLoadout][attackerID].kills++;
        classPlayerUpdates[resultID][victimLoadout][victimID].deaths++;
    }

    callback();
}

function insertAchievement(message, resultID, dbConnectionCheevo, callback)
{
    var charID = message.character_id;
    var cheevoID = message.achievement_id;

    var updateCheevoQuery = 'UPDATE ws_achievements SET occurances=occurances+1 WHERE playerID ='+charID+' AND achievementID = '+cheevoID+' AND resultID ='+resultID;

    dbConnectionCheevo.query(updateCheevoQuery, function(err, resultCheevo)
    {
        if (err)
        {
            if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
            {
                reportError(err, "Unable to update achievement");
            }
            else if (err)
            {
                handleDeadlock(updateCheevoQuery, "Achievement Update", 0);
            }
        }

        if (resultCheevo !== undefined && resultCheevo.affectedRows === 0) // If missing record
        {
            if (config.debug.achievements == 1)
            {
                console.log(notice("INSERTING ACHIVEMENT RECORD"));
            }

            var cheevoArray =
            {
                playerID : charID,
                resultID: resultID,
                achievementID: cheevoID,
                occurances: 1
            };

            dbConnectionCheevo.query('INSERT INTO ws_achievements SET ?', cheevoArray, function(err, result)
            {
                if (err)
                {
                    if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                    {
                        reportError(err, "Insert Achievements Stats record (#"+resultID+")");
                    }
                    else
                    {
                        handleDeadlock(updateCheevoQuery, "Insert Achivement", 0);
                    }
                }
            });
        }
    });

    callback();
}

var populationPulls = {};

setInterval(function()
{
    populationPulls = {};
}, 30000);

function insertPopulationStats(resultID, dbConnectionPopulation, callback)
{
    var populationInstance = populationInstances[resultID];

    if (populationPulls[resultID] === undefined)
    {
        populationPulls[resultID] = true;

        var time = new Date().getTime();
        var mysqltime = Math.round(time / 1000);

        if (populationInstance !== undefined)
        {
            var popArray =
            {
                resultID  : resultID,
                timestamp : mysqltime,
                worldID   : parseInt(populationInstance.world),
                zoneID    : parseInt(populationInstance.zone),
                popsVS    : parseInt(populationInstance.VS),
                popsNC    : parseInt(populationInstance.NC),
                popsTR    : parseInt(populationInstance.TR),
                popsTotal : parseInt(populationInstance.total),
            };

            sendResult("pops", popArray, resultID);

            dbConnectionPopulation.query('INSERT INTO ws_pops SET ?', popArray, function(err, result)
            {
                if (err)
                {
                    if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                    {
                        reportError(err, "Insert Population Stats");
                    }
                    else
                    {
                        reportError(err, "Insert Popualtion Stats (Non deadlock)");
                    }
                }
                else
                {
                    console.log(success("Inserted Population Data for Alert #"+resultID));
                }
            });
        }
    }
    else
    {
        if (config.debug.population === true)
        {
            console.log(notice("Population Change out of range - Skipping"));
        }
    }

    callback();
}

function sendResult(messageType, message, resultID) // Sends message to WS Clients
{
    var messageToSend = {};

    if (config.debug.responses === true)
    {
        console.log(notice("STARTING RESULT SEND"));
    }

    if (message) // If Valid
    {
        messageToSend.data = message;
        messageToSend.messageType = messageType;

        if (config.debug.responses === true)
        {
            console.log("WEBSOCKET TO RESULT #"+resultID+" MESSAGE:");
            console.log(messageToSend);
        }

            if (resultSubscriptions[resultID]) // If script was too quick for subscription
            {
                Object.keys(resultSubscriptions[resultID]).forEach(function(key)
                {
                    var clientConnection = resultSubscriptions[resultID][key];

                    clientConnection.send(JSON.stringify(messageToSend), function(error)
                    {
                        if (error)
                        {
                            delete clientConnections[clientConnection.id];
                            delete resultSubscriptions[resultID][clientConnection.id];

                            if (config.debug.clients === true)
                            {
                                console.log(notice("Websocket connection closed - Total: "+Object.keys(clientConnections).length));
                            }
                            console.log(critical("Client Error: "+error));
                        }
                    });
                });
            }

        if (config.debug.keepalive === true && messageType != "keepalive")
        {
            console.log(notice("Message Sent to Result Websockets"));
        }
    }
}

function sendMonitor(messageType, message) // Sends message to WS Clients
{
    var messageToSend = {};

    if (message) // If Valid
    {
        messageToSend.data = message;
        messageToSend.messageType = messageType;

        if (config.debug.clients === true)
        {
            console.log("WEBSOCKET MESSAGE:");
            console.log(messageToSend);
        }

        if ((messageType == "alertStart") || (messageType == "alertEnd") || (messageType == "update")) // Send to monitor
        {
            Object.keys(clientConnections).forEach(function(key)
            {
                var clientConnection = clientConnections[key];

                clientConnection.send(JSON.stringify(messageToSend), function(error)
                {
                    if (error)
                    {
                        delete clientConnections[clientConnection.id];

                        console.log(critical("Websocket Monitor Error: "+error));
                    }
                });
            });
        }

        if (config.debug.keepalive === true && messageType != "keepalive")
        {
            console.log(notice("Message Sent to Monitor Websockets"));
        }
    }
}

function sendAdmins(messageType, message) // Sends message to WS Clients
{
    var messageToSend = {};

    if (message) // If Valid
    {
        messageToSend.data = message;
        messageToSend.messageType = messageType;

        if (config.debug.clients === true && messageType !== "perf")
        {
            console.log("WEBSOCKET MESSAGE:");
            console.log(messageToSend);
        }

        if (messageType == "perf") // Send only to perf subs
        {
            Object.keys(clientAdminPerfConnections).forEach(function(key)
            {
                var clientConnection = clientAdminPerfConnections[key];

                clientConnection.send(JSON.stringify(messageToSend), function(error)
                {
                    if (error)
                    {
                        console.log(critical("Websocket Admin Error: "+error));
                        delete clientAdminPerfConnections[clientConnection.id];
                    }
                });
            });
        }
        else
        {
        Object.keys(clientAdminConnections).forEach(function(key)
        {
            var clientConnection = clientAdminConnections[key];

            clientConnection.send(JSON.stringify(messageToSend), function(error)
            {
                if (error)
                {
                        console.log(critical("Websocket Admin Error: "+error));
                        delete clientAdminConnections[clientConnection.id];
                    }
                });
            });
        }

        if (config.debug.clients === true && messageType !== "perf" && messageType !== "keepalive")
        {
            console.log(notice("Message Sent to Admin Websockets"));
        }
    }
}

// Pings connections to see if they're still alive
setInterval(function()
{
    var message = "ping!";

    sendAll("keepalive", message);
}, 5000);

function sendAll(messageType, message) // Sends message to WS Clients
{
    var messageToSend = {};

    if (message) // If Valid
    {
        messageToSend.data = message;
        messageToSend.messageType = messageType;

        Object.keys(clientConnections).forEach(function(key)
        {
            var clientConnection = clientConnections[key];

            clientConnection.send(JSON.stringify(messageToSend), function(error)
            {
                if (error)
                {
                    console.log(critical("Websocket Error: "+error));
                    delete clientConnections[clientConnection.id];
                }
            });
        });

        if (config.debug.clients === true && messageType !== "keepalive")
        {
            console.log(notice("Message Sent to All Websockets"));
            console.log(messageType);
        }
    }
}

function DateCalc(d)
{
    var year, month, day, hour, minute, seconds;

    year = String(d.getFullYear());
    month = String(d.getUTCMonth() + 1);
    hour = String(d.getUTCHours());
    minute = String(d.getUTCMinutes());
    seconds = String(d.getUTCSeconds());

    if (month.length == 1) {
        month = "0" + month;
    }
    day = String(d.getDate());
    if (day.length == 1) {
        day = "0" + day;
    }
    if (hour.length == 1) // If needing a preceeding 0
    {
        hour = "0"+hour;
    }
    if (minute.length == 1)
    {
        minute = "0"+minute;
    }
    if (seconds.length == 1)
    {
        seconds = "0"+seconds;
    }
    return year+"-"+month+"-"+day+" "+hour+":"+minute+":"+seconds;
}

function findPlayerName(playerID, world, callback)
{
    world = parseInt(world);
    var url;

    if (playerID === false) {
        console.log(critical("FALSE PLAYER ID! WORLD: "+world));
        callback(false, false);
    } else {
        if (world >= 2000)
        {
            url = 'http://census.daybreakgames.com/s:'+config.serviceID+'/get/ps2ps4eu:v2/character/?character_id='+playerID;
        }
        else if(world >= 1000)
        {
            url = 'http://census.daybreakgames.com/s:'+config.serviceID+'/get/ps2ps4us:v2/character/?character_id='+playerID;
        }
        else
        {
            url = 'http://census.daybreakgames.com/s:'+config.serviceID+'/get/ps2:v2/character/?character_id='+playerID;
        }

        if (config.debug.census === true)
        {
            console.log("========== FINDING PLAYER NAME =========");
            console.log("INPUT :"+playerID);
        }

        http.get(url, function(res) {
            var body = '';

            res.on('data', function(chunk) {
                body += chunk;
            });

            res.on('end', function() {

                var success = 1;
                var returned;

                try
                {
                    returned = JSON.parse(body);
                }
                catch(exception)
                {
                    console.log(critical("BAD RETURN FROM CENSUS - Player Cache"));
                    console.log(url);
                    console.log(body);
                    success = 0;
                }

                if (success === 1)
                {
                    if (returned === undefined)
                    {
                        console.log(critical("CENSUS NO DATA!"));
                        console.log(notice("QUERY: "+url));
                    }

                    if (returned.character_list !== undefined)
                    {
                        var characterListLength = returned.character_list.length;

                        if (characterListLength === 0)
                        {
                            console.log(critical("CENSUS RETURNED NO CHARACTERS!"));
                            console.log(notice("WORLD: "+world+" QUERY: "+url));
                        }

                        if (success == 1)
                        {
                            var valid = returned.returned;

                            if (valid == 1)
                            {
                                if (config.debug.census === true)
                                {
                                    console.log("RESPONSE: "+returned.character_list);
                                    console.log("INPUT :"+playerID);
                                }

                                var name = returned.character_list[0].name.first;
                                var faction = returned.character_list[0].faction_id;

                                callback(name, faction);
                            }
                            else
                            {
                                if (config.debug.census === true)
                                    console.log(warning("FAILED TO GET PLAYER NAME!"));

                                callback(false, false);
                            }
                        }
                    }
                }
                else
                {
                    console.log(warning("CENSUS API QUERY FAIL"));
                    console.log(notice("QUERY: "+url));
                }
            });
        }).on('error', function(e)
        {
              console.log("CENSUS QUERY ERROR: ", e);
              callback(false, false);
        });
    }
}

function findOutfitName(outfitID, world, callback)
{
    var url;
    if((outfitID == "-1") || (outfitID == "0"))
    {
        return "";
    }

    if (outfitID === false) {
        console.log(critical("OUTFIT ID IS FALSE!"));
    }

    if (world >= 2000)
    {
        url = 'http://census.daybreakgames.com/s:'+config.serviceID+'/get/ps2ps4eu:v2/outfit/?outfit_id='+outfitID;
    }
    else if(world >= 1000)
    {
        url = 'http://census.daybreakgames.com/s:'+config.serviceID+'/get/ps2ps4us:v2/outfit/?outfit_id='+outfitID;
    }
    else
    {
        url = 'http://census.daybreakgames.com/s:'+config.serviceID+'/get/ps2:v2/outfit/?outfit_id='+outfitID;
    }

    if (config.debug.census === true)
    {
        console.log("========== FINDING OUTFIT NAME =========");
        console.log("INPUT :"+outfitID);
    }

    http.get(url, function(res) {
        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {

            var success = 1;
            var returned;
            var valid = 0;

            try
            {
                returned = JSON.parse(body);
            }
            catch(exception)
            {
                console.log(critical("BAD RETURN FROM CENSUS - Outfit Cache"));
                success = 0;
            }

            if (success === 1)
            {
                valid = returned.returned;

                if (valid === 1)
                {
                    if (config.debug.census === true)
                    {
                        console.log("RESPONSE: "+returned.outfit_list);
                        console.log("INPUT :"+outfitID);
                    }

                    var name = returned.outfit_list[0].name;
                    var tag = returned.outfit_list[0].alias;
                    var leader = returned.outfit_list[0].leader_character_id;

                    callback(name, tag, leader);
                }
                else
                {
                    if (config.debug.census === true)
                    {
                        console.log(warning("FAILED TO GET OUTFIT NAME!"));
                        console.log(url);
                    }

                    callback(false, false, false);
                }
            }
        });
    }).on('error', function(e) {
          console.log("CENSUS OUTFIT ERROR:: ", e);
          callback(false, false, false);
    });
}

function checkPlayerCache(playerID, world, dbConnectionCache, callback)
{
    dbConnectionCache.query('SELECT * FROM player_cache WHERE playerID="'+playerID+'"', function(err, result)
    {
        if (err)
        {
            throw err;
        }
        else
        {
            if (config.debug.cache === true)
            {
                console.log(notice("PLAYER CACHE RESULT: " + JSON.stringify(result[0], null, 4)));
            }

            if (!result[0]) // If empty
            {
                findPlayerName(playerID, world, function(name, faction)
                {
                    if (name !== false && faction !== false)
                    {
                        var now = Math.round(new Date().getTime() / 1000);
                        var cacheExpires = now + 86400; // 1 Day

                        var insertPArray =
                        {
                            playerID: playerID,
                            playerName: name,
                            playerFaction: faction,
                            expires: cacheExpires
                        };

                        dbConnectionCache.query('INSERT INTO player_cache SET ?', insertPArray, function(err, result)
                        {
                            if (err)
                            {
                                if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                                {
                                    reportError(err, "Insert Player Cache Record");
                                }
                                else
                                {
                                    if (config.debug.cache === true)
                                    {
                                        console.log(warning("INVALID / DUPLICATED PLAYER CACHE RECORD DETECTED! Skipping!"));
                                    }
                                }
                            }
                            else
                            {
                                if (config.debug.cache === true)
                                {
                                    console.log(success("INSERTED PLAYER RECORD INTO CACHE TABLE"));
                                }

                                dbConnectionCache.query('UPDATE cache_hits SET cacheMisses=cacheMisses+1 WHERE dataType="PlayerCache"');
                                callback(name);
                            }
                        });
                    }
                    else
                    {
                        console.log(critical("CENSUS PLAYER QUERY FAILED! SEARCHED FOR PLAYER: "+playerID));
                        callback(false);
                    }
                });
            }
            else if (result[0])
            {
                if (config.debug.cache === true)
                {
                    console.log(success("PLAYER CACHE HIT!"));
                }

                dbConnectionCache.query('UPDATE cache_hits SET cacheHits=CacheHits+1 WHERE dataType="PlayerCache"');
                callback(result[0].playerName);
            }
        }
    });
}

function checkOutfitCache(outfitID, worldID, dbConnectionCache, callback)
{
    if (config.debug.cache === true)
    {
        console.log(critical("OUTFIT ID: "+outfitID));
    }

    if ((outfitID == -1) || (outfitID == "0"))
    {
        if (config.debug.cache === true)
        {
            console.log(critical("IGNORING OUTFIT PROCESSING"));
        }

        callback(undefined, undefined, undefined, undefined);
    }
    else
    {
        dbConnectionCache.query('SELECT * FROM outfit_cache WHERE outfitID="'+outfitID+'"', function(err, result)
        {
            if (err)
            {
                throw err;
            }
            else
            {
                if (config.debug.cache === true)
                {
                    console.log(notice("OUTFIT CACHE RESULT: " + JSON.stringify(result[0], null, 4)));
                }

                if (!result[0]) // If empty
                {
                    findOutfitName(outfitID, worldID, function(outfitName, tag, leaderID)
                    {
                        if (config.debug.cache === true)
                        {
                            console.log("FOUND OUTFIT NAME");
                        }
                        if (leaderID === false) {
                            console.log(critical("MISSING LEADER ID! Skipping cache."));
                            callback (false, false, false, false);
                        }

                        if (outfitName !== false)
                        {
                            findPlayerName(leaderID, worldID, function(name, faction)
                            {
                                var now = Math.round(new Date().getTime() / 1000);
                                var cacheExpires = now + 86400; // 1 Day

                                var insertOArray =
                                {
                                    outfitName: outfitName,
                                    outfitTag: tag,
                                    outfitFaction: faction,
                                    outfitID: outfitID,
                                    outfitWorld: worldID,
                                    expires: cacheExpires
                                };
                                dbConnectionCache.query('INSERT INTO outfit_cache SET ?', insertOArray, function(err, result)
                                {
                                    if (err)
                                    {
                                        if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                                        {
                                            reportError(err, "Insert Outfit Cache Record");
                                        }
                                        else
                                        {
                                            if (config.debug.databaseWarnings === true)
                                            {
                                                console.log(warning("INVALID / DUPLICATED OUTFIT CACHE RECORD DETECTED! Skipping!"));
                                            }
                                        }
                                    }
                                    else
                                    {
                                        if (config.debug.cache === true)
                                        {
                                            console.log(success("INSERTED OUTFIT RECORD INTO CACHE TABLE"));
                                        }

                                        dbConnectionCache.query('UPDATE cache_hits SET cacheMisses=cacheMisses+1 WHERE dataType="OutfitCache"');

                                        callback(outfitName, tag, faction, outfitID);
                                    }
                                });
                            });
                        }
                        else
                        {
                            console.log(critical("MISSING OUTFIT INFO! Skipping cache."));
                            console.log(notice(outfitID));
                            console.log(notice(worldID));
                            callback (false, false, false, false);
                        }
                    });
                }
                else
                {
                    dbConnectionCache.query('UPDATE cache_hits SET cacheHits=cacheHits+1 WHERE dataType="OutfitCache"');

                    if (config.debug.cache === true)
                    {
                        console.log(success("OUTFIT CACHE HIT!"));
                    }

                    callback(result[0].outfitName, result[0].outfitTag, result[0].outfitFaction, result[0].outfitID);
                }
            }
        });
    }
}

var factions = [];
factions[0] = "VS";
factions[1] = "NC";
factions[2] = "TR";

function calcWinners(message, resultID, Lresult, Fresult, dbConnection, callback)
{
    dbConnection.query("SELECT * FROM ws_results WHERE resultID="+resultID, function(error, result)
    {
        if (!result[0]) // If record is empty
        {
            throw ("NO RESULT RECORD COULD BE FOUND! FOR ALERT #"+resultID);
        }
        var attackers = result[0]["ResultStarter"];

        var eventID = result[0]["ResultAlertType"];
        var top = 0;
        var winner = "TO CALC";
        var draw = 0;
        var domination = 0;

        var empires = [];

        empires[0] = Lresult[0].controlVS;
        empires[1] = Lresult[0].controlNC;
        empires[2] = Lresult[0].controlTR;

        for (var i = empires.length - 1; i >= 0; i--) { // Sort empires into result order
            if (empires[i] > top)
            {
                top = empires[i];
                winner = factions[i];
            }
        }

        console.log(success("WINNER = "+winner));

        empires.sort(function(a, b){ return b-a; });

        switch(eventID) // Logic for calculating alert winner scenarios (domination etc)
        {
            // Adversarial Alerts
            case '31':
            case '32':
            case '33':
            case '34':
            {
                var DomThreshold = 65;
                var AttWinThreshold = 50;
                var DefWinThreshold = 50;
                var WinThreshold = 50;
                var Fresult = [];

                Fresult[1] = Lresult[0].controlVS;
                Fresult[2] = Lresult[0].controlNC;
                Fresult[3] = Lresult[0].controlTR;

                console.log("F RESULT: "+Fresult);
                console.log("ATTACKERS: "+attackers);
                console.log("ATTACKERS %:" +Fresult[attackers]);

                if(Fresult[attackers] >= DomThreshold) // If attackers maintain higher than 65%
                {
                    winner = factions[attackers];
                    domination = 1;
                }
                else
                {
                    top = empires[0];

                    if (top >= WinThreshold)
                    {
                        for (i = 0; i < Fresult.length; i++) {
                            if (Fresult[i] == top)
                            {
                                winner = factions[i];
                            }
                        }
                    }
                    else if (empires[0] == empires[1]) // If Draw
                    {
                        winner = "DRAW";
                        draw = 1;
                        console.log("DRAW!");
                    }
                }

                callback(winner, draw, domination);
                break;
            }
            // Territory Alerts
            case '1':
            case '2':
            case '3':
            case '4':
            {
                top = empires[0];

                if(message.domination == 1) // If domination
                {
                    domination = 1;
                    console.log("DOMINATION");
                }
                else if (empires[0] == empires[1])
                {
                    winner = "DRAW";
                    draw = 1;
                    console.log("DRAW!");
                }

                // Otherwise, pick the winner as determined above the switch.

                break;
            }
        }

        console.log("WINNER IS: "+winner);

        callback(winner, draw, domination);
    });
}

/* Helper Functions */

function APIAlertTypes(eventID, callback)
{
    var type = null;
    var cont = null;

    switch (eventID)
    {
        case '1':
            type = "Territory";
            cont = "Indar";
            break;
        case '2':
            type = "Territory";
            cont = "Esamir";
            break;
        case '3':
            type = "Territory";
            cont = "Amerish";
            break;
        case '4':
            type = "Territory";
            cont = "Hossin";
            break;
        case '5':
            type = "ERROR";
            cont = "ERROR";
            break;
        case '6':
            type = "ERROR";
            cont = "ERROR";
            break;
        case '7':
            type = "Bio";
            cont = "Amerish";
            break;
        case '8':
            type = "Tech";
            cont = "Amerish";
            break;
        case '9':
            type = "Amp";
            cont = "Amerish";
            break;
        case '10':
            type = "Bio";
            cont = "Indar";
            break;
        case '11':
            type = "Tech";
            cont = "Indar";
            break;
        case '12':
            type = "Amp";
            cont = "Indar";
            break;
        case '13':
            type = "Bio";
            cont = "Esamir";
            break;
        case '14':
            type = "Amp";
            cont = "Esamir";
            break;
        case '15':
            type = "Bio";
            cont = "Hossin";
            break;
        case '16':
            type = "Tech";
            cont= "Hossin";
            break;
        case '17':
            type = "Amp";
            cont = "Hossin";
            break;
        case '31':
            type = "Territory";
            cont = "Indar";
            break;
        case '32':
            type = "Territory";
            cont = "Esamir";
            break;
        case '33':
            type = "Territory";
            cont = "Amerish";
            break;
        case '34':
            type = "Territory";
            cont = "Hossin";
            break;
    }

    var result = null;

    if ((type !== null) && (cont !== null)) // If valid
    {
        result =
        {
            type: type,
            cont: cont
        };
    }

    callback(result);
}

var charFlags = {};
var charIDs = [];

function addKillMonitor(charID, vCharID, flag, timestamp, killerVID, victimVID, resultID, attName, vicName, dbConnection)
{
    if (!attName)
    {
        attName = false;
    }
    if (!vicName)
    {
        vicName = false;
    }

    if (!charFlags[charID])
    {
        var push = {
            "charID": charID,
            "vCharID": vCharID,
            "timestamp": timestamp,
            "vKill": 0,
            "kill": 0,
            "killerVID": 0,
            "victimVID": 0,
            "resultID": resultID,
            "aName": attName,
            "vName": vicName
        };

        charFlags[charID] = push;

        if (charIDs !== undefined)
        {
            charIDs.push(charID);
        }
        else
        {
            charIDs = charID;
        }
    }

    if (flag == "vKill")
    {
        if (charFlags[charID].vKill === 0)
        {
            charFlags[charID].killerVID = killerVID;
            charFlags[charID].victimVID = victimVID;
            charFlags[charID].vKill = 1;
        }
    }
    else if (flag == "kill")
    {
        if (charFlags[charID].kill === 0)
        {
            charFlags[charID].kill = 1;
            charFlags[charID].killerVID = killerVID;
        }
    }

    if ((attName !== false) && (vicName !== false))
    {
        charFlags[charID].aName = attName;
        charFlags[charID].vName = vicName;
    }
}

setInterval(function()
{
    for (var i = charIDs.length - 1; i >= 0; i--) // Loop through all of the monitored characters
    {
        var charID = charIDs[i];

        if (charFlags[charID])
        {
            var killerVID = charFlags[charID].killerVID;
            var victimVID = charFlags[charID].victimVID;
            var resultID = charFlags[charID].resultID;
            var killerID = charFlags[charID].charID;
            var victimID = charFlags[charID].vCharID;

            if ((charFlags[charID].kill == 1) && (charFlags[charID].vKill == 1)) // Vehicle with Occ
            {
                if (config.debug.vehicles === true)
                {
                    console.log(critical("VEHICLE KILL WITH OCCUPANT DETECTED!"));
                }

                incrementVehicleKills(1, killerVID, victimVID, resultID, killerID, victimID);
            }
            else if ((charFlags[charID].kill === 0) && (charFlags[charID].vKill === 1)) // Vehicle without Occ
            {
                if (config.debug.vehicles === true)
                {
                    console.log(critical("VEHICLE KILL W/O OCCUPANT DETECTED"));
                }

                incrementVehicleKills(2, killerVID, victimVID, resultID, killerID, victimID);
            }
            else if ((charFlags[charID].kill === 1) && (charFlags[charID].vKill === 0)) // Normal Kill Occ
            {
                if (config.debug.vehicles === true)
                {
                    console.log(critical("NORMAL KILL DETECTED"));
                }

                incrementVehicleKills(3, killerVID, 0, resultID, killerID, victimID);
            }

            var nanites = vehNanite[charFlags[charID].victimVID];

            var array = {
                "aCharID": charFlags[charID].charID,
                "vCharID": charFlags[charID].vCharID,
                "attackerName": charFlags[charID].aName,
                "victimName": charFlags[charID].vName,
                "timestamp": charFlags[charID].timestamp,
                "killerVID": charFlags[charID].killerVID,
                "victimVID": charFlags[charID].victimVID,
                "nanites": nanites,
                "resultID": charFlags[charID].resultID
            };

            sendResult("vehicleKill", array);
        }
        else
        {
            console.log("CHARFLAG DOESN'T EXIST!");
        }
    }

    charIDs = [];
    charFlags = [];

}, 1000);

function incrementVehicleKills(type, kID, vID, resultID, killerID, victimID)
{
    if (resultID !== undefined)
    {
        pool.getConnection(function(poolErr, dbConnectionVehicleKill)
        {
            if (poolErr)
            {
                throw(poolErr);
            }
            else
            {
                var Kquery;
                var Vquery;
                var iQueryK;
                var iQueryV;

                if (kID === 0) // If the kill was by infrantry
                {
                    switch(type)
                    {
                        case 1:
                        {
                            type = 11;
                            break;
                        }
                        case 2:
                        {
                            type = 22;
                            break;
                        }
                    }
                }

                switch(type)
                {
                    case 1: // V->V w/ Occ
                    {
                        Kquery = "killCount=killCount+1, killVCount=killVCount+1";
                        Vquery = "deathCount=deathCount+1, deathVCount=deathVCount+1";
                        iQueryK = kID+", 1, 0, 1, 0, 0, 0, 0, "+resultID;
                        iQueryV = vID+", 0, 0, 0, 1, 0, 1, 0, "+resultID;
                        pQueryK = kID+", "+killerID+", 1, 0, 1, 0, 0, 0, 0, "+resultID;
                        pQueryV = vID+", "+victimID+", 0, 0, 0, 1, 0, 1, 0, "+resultID;
                        break;
                    }
                    case 11: // I->V w/ Occ
                    {
                        Vquery = "deathCount=deathCount+1, deathICount=deathICount+1";
                        iQueryV = vID+", 0, 0, 0, 1, 1, 0, 0, "+resultID;
                        pQueryV = vID+", "+victimID+", 0, 0, 0, 1, 1, 0, 0, "+resultID;
                        break;
                    }
                    case 2: // V->V no Occ
                    {
                        Kquery = "killCount=killCount+1, killVCount=killVCount+1";
                        Vquery = "deathCount=deathCount+1, deathVCount=deathVCount+1, bails=bails+1";
                        iQueryK = kID+", 1, 0, 1, 0, 0, 0, 0, "+resultID;
                        iQueryV = vID+", 0, 0, 0, 1, 0, 1, 1, "+resultID;
                        pQueryK = resultID+", "+kID+", "+killerID+", 1, 0, 1, 0, 0, 0, 0";
                        pQueryV = resultID+", "+vID+", "+victimID+", 0, 0, 0, 1, 0, 1, 1";
                        break;
                    }
                    case 22: // I->V no Occ
                    {
                        Vquery = "deathCount=deathCount+1, deathICount=deathICount+1, bails=bails+1";
                        iQueryV = vID+", 0, 0, 0, 1, 1, 0, 1, "+resultID;
                        pQueryV = vID+", "+victimID+", 0, 0, 0, 1, 1, 0, 1, "+resultID;
                        break;
                    }
                    case 3: // V->I
                    {
                        Kquery = "killCount=killCount+1, killICount=killICount+1";
                        iQueryK = kID+", 1, 1, 0, 0, 0, 0, 0, "+resultID;
                        pQueryK = kID+", "+killerID+", 1, 1, 0, 0, 0, 0, 0, "+resultID;
                        break;
                    }
                }

                if (kID !== 0)
                {
                    // Killer Vehicle
                    dbConnectionVehicleKill.query("UPDATE ws_vehicles_totals SET "+Kquery+" WHERE vehicleID = "+kID+" AND resultID = "+resultID, function(err, result)
                    {
                        if (err)
                        {
                            if (err.errno === 1213) // If deadlock
                            {
                                handleDeadlock("UPDATE ws_vehicles_totals SET "+Kquery+" WHERE vehicleID ="+vID+" AND resultID = "+resultID, "Vehicle Update", 0);
                            }
                            else
                            {
                                throw(err);
                            }

                        }
                        else if (result.affectedRows === 0) // If no update happened, try again
                        {
                            if (config.debug.vehicles === true)
                            {
                                console.log("Inserting New Killer Vehicle Record");
                                console.log(kID);
                                console.log(resultID);
                                console.log(iQueryK);
                            }

                            dbConnectionVehicleKill.query("INSERT INTO ws_vehicles_totals (vehicleID, killCount, killICount, killVCount, deathCount, deathICount, deathVCount, bails, resultID) VALUES ("+iQueryK+")", function(err, result)
                            {
                                if (err)
                                {
                                    if (err.errno != 1062) // If not a duplicate
                                    {
                                        console.log(message);
                                        reportError(err, "Insert Player Cache Record");
                                    }
                                }
                            });
                        }
                    });

                    dbConnectionVehicleKill.query("UPDATE ws_vehicles SET "+Kquery+" WHERE resultID = "+resultID+" AND playerID='"+killerID+"' AND vehicleID="+kID, function(err, result)
                    {
                        if (err)
                        {
                            if (err.errno === 1213) // If deadlock
                            {
                                handleDeadlock("UPDATE ws_vehicles SET "+Kquery+" WHERE resultID = "+resultID+" AND playerID='"+killerID+"' AND vehicleID="+kID, "Vehicle Update", 0);
                            }
                            else
                            {
                                throw(err);
                            }

                        }
                        else if (result.affectedRows === 0) // If no update happened, must be an insert
                        {
                            if (config.debug.vehicles === true)
                            {
                                console.log("Inserting New Killer Vehicle Record");
                                console.log(kID);
                                console.log(resultID);
                                console.log(iQueryK);
                            }

                            dbConnectionVehicleKill.query("INSERT INTO ws_vehicles (vehicleID, killCount, killICount, killVCount, deathCount, deathICount, deathVCount, bails, resultID) VALUES ("+iQueryK+")", function(err, result)
                            {
                                if (err)
                                {
                                    if (err.errno != 1062) // If not a duplicate
                                    {
                                        reportError(err, "Insert Vehicle Kill Record");
                                        throw(err);
                                    }
                                }
                                else
                                {
                                    dbConnectionVehicleKill.query("UPDATE ws_vehicles SET "+Kquery+" WHERE resultID = "+resultID+" AND playerID='"+killerID+"' AND vehicleID="+kID, function(err, result)
                                    {
                                        if (err)
                                        {
                                            if (err.errno === 1213) // If deadlock
                                            {
                                                console.log(critical("DEADLOCK DETECTED (Vehicles Kill)"));

                                                handleDeadlock("UPDATE ws_vehicles SET "+Kquery+" WHERE resultID = "+resultID+" AND playerID='"+killerID+"' AND vehicleID="+kID, "Vehicle Update", 0);
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                }

                if (vID !== 0)
                {
                    dbConnectionVehicleKill.query("UPDATE ws_vehicles_totals SET "+Vquery+" WHERE vehicleID ="+vID+" AND resultID = "+resultID, function(err, result)
                    {
                        if (err)
                        {
                            if (err.errno === 1213) // If deadlock
                            {
                                console.log(critical("DEADLOCK DETECTED (Vehicles)"));

                                handleDeadlock("UPDATE ws_vehicles_totals SET "+Vquery+" WHERE vehicleID ="+vID+" AND resultID = "+resultID, "Vehicle Update", 0);
                            }
                            else
                            {
                                throw(err);
                            }

                        }
                        else if (result.affectedRows === 0) // If no update happened, try again
                        {
                            if (config.debug.vehicles === true)
                            {
                                console.log("Inserting New Victim Vehicle Record");
                                console.log(vID);
                                console.log(resultID);
                            }

                            dbConnectionVehicleKill.query("INSERT INTO ws_vehicles_totals (vehicleID, killCount, killICount, killVCount, deathCount, deathICount, deathVCount, bails, resultID) VALUES ("+iQueryV+")", function(err, result)
                            {
                                if (err)
                                {
                                    if (err.errno != 1062) // If not a duplicate
                                    {
                                        console.log(message);
                                        reportError(err, "Insert Vehicle Kills Total Record");
                                        throw(err);
                                    }
                                }
                                else
                                {
                                    setTimeout(function()
                                    {
                                        dbConnectionVehicleKill.query("UPDATE ws_vehicles_totals SET "+Vquery+" WHERE vehicleID ="+vID+" AND resultID = "+resultID, function(err, result)
                                        {
                                            if (err)
                                            {
                                                throw(err);
                                            }
                                        });
                                    }, 500);
                                }
                            });
                        }
                    });

                    dbConnectionVehicleKill.query("UPDATE ws_vehicles SET "+Vquery+" WHERE vehicleID ="+vID+" AND resultID = "+resultID, function(err, result)
                    {
                        if (err)
                        {
                            if (err.errno === 1213) // If deadlock
                            {
                                handleDeadlock("UPDATE ws_vehicles SET "+Vquery+" WHERE vehicleID ="+vID+" AND resultID = "+resultID, "Vehicle Update", 0);
                            }
                            else
                            {
                                throw(err);
                            }

                        }
                        else if (result.affectedRows === 0) // If no update happened, must be an insert
                        {
                            if (config.debug.vehicles === true)
                            {
                                console.log("Inserting New Victim Vehicle Record");
                                console.log(vID);
                                console.log(resultID);
                            }

                            dbConnectionVehicleKill.query("INSERT INTO ws_vehicles (vehicleID, playerID, killCount, killICount, killVCount, deathCount, deathICount, deathVCount, bails, resultID) VALUES ("+pQueryV+")", function(err, result)
                            {
                                if (err)
                                {
                                    if (err.errno != 1062) // If not a duplicate
                                    {
                                        console.log(message);
                                        reportError(err, "Insert Vehicle Victim Record");
                                        throw(err);
                                    }
                                    else
                                    {
                                        handleDeadlock("UPDATE ws_vehicles SET "+Vquery+" WHERE vehicleID ="+vID+" AND resultID = "+resultID, "Vehicle Update", 0);
                                    }
                                }
                            });
                        }
                    });
                }
            }

            dbConnectionVehicleKill.release();
        });
    }
}

function insertInitialMapData(data, callback)
{
    var worldID = String(data.world);
    var zoneID = String(data.zone);
    var resultID = String(data.resultID);

    var apiNamespace = "ps2:v2";

    if(worldID >= 2000) {
        apiNamespace = "ps2ps4eu:v2";
    } else if (worldID >= 1000) {
        apiNamespace = "ps2ps4us:v2";
    }

    console.log("API NAMESPACE: "+apiNamespace);

    var url = "http://census.daybreakgames.com/s:"+config.serviceID+"/get/"+apiNamespace+"/map/?world_id="+worldID+"&zone_ids="+zoneID;
    console.log("FIRING SCRIPT: "+url);

    http.get(url, function(res) {
        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('error', function(e) {
            reportError(e, "Census Map Initial Query");
        });

        res.on('end', function() {

            var success = 1;
            var json;

            try
            {
                json = JSON.parse(body);
            }
            catch(exception)
            {
                console.log(critical("BAD RETURN FROM CENSUS - Map Initial"));
                console.log(url);
                console.log(body);
                success = 0;
            }

            if (success == 1)
            {
                var mapData = json["map_list"][0]["Regions"]["Row"];

                cachePool.getConnection(function(err, dbMapInsertCache)
                {
                    if (err)
                    {
                        throw (err);
                    }

                    dbMapInsertCache.query("SELECT * FROM facility_data WHERE zone = "+zoneID, function(err, data)
                    {
                        dbMapInsertCache.release();
                        if (err) { throw(err); }

                        var facData = {};

                        if (data[0] !== undefined) { // If someone came back

                            for (var i = data.length - 1; i >= 0; i--) {

                                var facilityMapID = data[i].facilityMapID;

                                facData[facilityMapID] = {
                                    "facilityID": data[i].facilityID,
                                    "facilityName": data[i].facilityName,
                                    "facilityType": data[i].facilityType,
                                    "zone": data[i].zone,
                                    "facilityMapID": data[i].facilityMapID
                                };
                            }

                            pool.getConnection(function(err, dbMapInsert)
                            {
                                if(err) { throw (err); }

                                Object.keys(mapData).forEach(function(key) {

                                    var facilityMapID = mapData[key]["RowData"].RegionId;

                                    var facilityData = facData[facilityMapID];

                                    var object = {
                                        worldID: worldID,
                                        zoneID: zoneID,
                                        facilityID: facilityData.facilityID,
                                        facilityTypeID: facilityData.facilityType,
                                        facilityOwner: mapData[key]["RowData"].FactionId,
                                        resultID: resultID
                                    };

                                    dbMapInsert.query("INSERT INTO ws_map_initial SET ?", object, function(err) {
                                        if (err) { throw(err); }
                                    });
                                });

                                console.log("INSERTED MAP DATA FOR ALERT: #"+resultID);

                                dbMapInsert.release();
                            });
                        } else {
                            reportError("No supplimental data returned!", "Insert Initial Map Data");
                        }
                    });
                });
            }

            var statusMessage =
            {
                type: "map",
                id: resultID,
            };

            sendAdmins("eventStatus", statusMessage);

            var resultMessage =
            {
                id: resultID,
            };

            sendResult("eventStatus", resultMessage);

            callback();
        });
    });
}

var messagesRecieved = 0;
var messagesRecievedLast = 0;
var messagesRecievedSec = 0;
var forcedEndings = 0;

// Loop through instances checking that they're valid and are not due to be ending
function checkInstances(callback)
{
    var time = new Date().getTime();
    time = parseInt(time / 1000); // To convert to seconds

    pool.getConnection(function(poolErr, dbConnection)
    {
        Object.keys(instances).forEach(function(key)
        {
            var world = instances[key].world;
            var zone = instances[key].zone;
            var overtime = instances[key].endTime + 10; // If end + 10 seconds

            // See if the alert is overdue
            if (time > overtime) // If overdue
            {
                var resultID = instances[key].resultID;

                console.log(critical("====================== ALERT #"+resultID+" OVERDUE!!!====================="));
                console.log("CHECKING TIME: "+time);
                console.log("RESULT TIME: "+instances[key].endTime); // Alert Time

                var endmessage = // Fake the end message
                {
                    world_id: world,
                    zone_id: zone,
                    start_time: instances[key].startTime, // Needed for subscriptions
                    end_time: instances[key].endTime
                };

                forcedEndings++;

                if (config.debug.metagame === true)
                {
                    console.log(endmessage);
                }

                endAlert(endmessage, resultID, client, dbConnection, function(resultID)
                {
                    console.log(critical("FORCFULLY ENDED ALERT #"+resultID+" W: "+world+" - Z:"+zone));
                    reportError("Forced Ended alert #"+resultID, "Check Instances");
                });
            }

            dbConnection.query("SELECT * FROM ws_map_initial WHERE resultID = "+instances[key].resultID, function(error, result)
            {
                if (error)
                {
                    throw(error);
                }
            });
        });
        dbConnection.release();
    });

    callback();
}

function resetConnection()
{
    wsClient = new persistentClient();
}

function fireSubscriptions(message, resultID, mode, event)
{
    var world = String(message.world_id);
    var zone = String(message.zone_id);
    var started = String(message.start_time);

    if (config.toggles.combat === true)
    {
        var combatMessage = '{"action":"'+mode+'","event":"Combat","worlds":["'+world+'"]}';
        //var combatMessage = '{"action":"'+mode+'","event":"Combat","worlds":["'+world+'"],"zones":["'+zone+'"]}';

        console.log(success(combatMessage));
        try {
            client.send(combatMessage);
        } catch (e) {
            console.log(critical("ERROR SENDING "+mode+" MESSAGE"));
            reportError("Error "+mode+" from API Socket - "+e, "Combat Message", true);
            return false;
        }
    }

    if (config.toggles.vehicledestroy === true)
    {
        var vehicleCombatMessage = '{"action":"'+mode+'","event":"VehicleDestroy","worlds":["'+world+'"]}';
        //var vehicleCombatMessage = '{"action":"'+mode+'","event":"VehicleDestroy","worlds":["'+world+'"],"zones":["'+zone+'"]}';

        console.log(success(vehicleCombatMessage));

        try {
            client.send(vehicleCombatMessage);
        } catch (e) {
            console.log(critical("ERROR SENDING "+mode+" MESSAGE"));
            reportError("Error "+mode+" from API Socket - "+e, "Vehicle Message", true);
            return false;
        }
    }

    if (config.toggles.facilitycontrol === true)
    {
        var facilityMessage = '{"action":"'+mode+'","event":"FacilityControl","worlds":["'+world+'"]}';
        //var facilityMessage = '{"action":"'+mode+'","event":"FacilityControl","worlds":["'+world+'"],"zones":["'+zone+'"]}';

        console.log(success(facilityMessage));

        try {
            client.send(facilityMessage);
        } catch (e) {
            console.log(critical("ERROR SENDING "+mode+" MESSAGE"));
            reportError("Error "+mode+" from API Socket - "+e, "Facility Message", true);
            return false;
        }
    }

    // Pop message moved to global scope.

    if (config.toggles.xpmessage === true)
    {
        var xpMessage = '{"action":"'+mode+'","event":"ExperienceEarned","worlds":["'+world+'"]}';
        //var xpMessage = '{"action":"'+mode+'","event":"ExperienceEarned","worlds":["'+world+'"],"zones":["'+zone+'"]}';

        console.log(success(xpMessage));

        try {
            client.send(xpMessage);
        } catch (e) {
            console.log(critical("ERROR SENDING "+mode+" MESSAGE"));
            reportError("Error "+mode+" from API Socket - "+e, "XP Message", true);
            return false;
        }
    }

    if (config.toggles.achievements === true)
    {
        var achievementMessage = '{"action":"'+mode+'","event":"AchievementEarned","worlds":["'+world+'"]}';
        //var achievementMessage = '{"action":"'+mode+'","event":"AchievementEarned","worlds":["'+world+'"],"zones":["'+zone+'"]}';

        console.log(success(achievementMessage));

        try {
            client.send(achievementMessage);
        } catch (e) {
            console.log(critical("ERROR SENDING "+mode+" MESSAGE"));
            reportError("Error "+mode+" from API Socket - "+e, "Achievements Message", true);
            return false;
        }
    }

    if (event !== true)
    {
        setInstances(message, resultID, mode);
    }
}

function setInstances(message, resultID, mode)
{
    var endTime = calcEndTime(message.start_time, message.metagame_event_type_id);
    var type = message.metagame_event_type_id;
    var world = message.world_id;
    var zone = message.zone_id;

    if (mode == "subscribe")
    {
        instances[resultID] = {
            status:     true,
            resultID:   resultID,
            startTime:  message.start_time,
            endTime:    endTime,
            type:       type,
            world:      world,
            zone:       zone,
            controlVS:  message.control_vs,
            controlNC:  message.control_nc,
            controlTR:  message.control_tr,
            instanceID: message.instance_id
        };

        console.log(success("INSTANCE SUCCESSFULLY CREATED!"));
    }
}

function restoreSubs(client, dbConnectionI, callback)
{
    instances = {}; // Clear object if reconnected or being rebuilt

    dbConnectionI.query('SELECT * FROM ws_instances', function(err, resultInstance)
    {
        console.log("INITIAL INSTANCE QUERY FIRED");

        if(err)
        {
            reportError(err, "Select Initial Actives");
            throw (err);
        }

        var time = new Date().getTime() / 1000;

        for (i = 0; i < resultInstance.length; i++) // Loop through result array
        {
            if (resultInstance[i].started < time) // If it requires a subscription now
            {
                var world      = String(resultInstance[i].world);
                var zone       = String(resultInstance[i].zone);
                var started    = String(resultInstance[i].started);
                var endtime    = String(resultInstance[i].endtime);
                var type       = String(resultInstance[i].type);
                var resultID   = resultInstance[i].resultID;
                var controlVS  = resultInstance[i].controlVS;
                var controlNC  = resultInstance[i].controlNC;
                var controlTR  = resultInstance[i].controlTR;
                var instanceID = resultInstance[i].instanceID;

                var message = {
                    "world_id":               world,
                    "zone_id":                zone,
                    "start_time":             started,
                    "end_time":               0,
                    "metagame_event_type_id": type,
                    "control_vs":             controlVS,
                    "control_nc":             controlNC,
                    "control_tr":             controlTR,
                    "instance_id":            instanceID
                };

                // Fake the message to send to the subscriptions function

                fireSubscriptions(message, resultID, "subscribe");
            }
            else
            {
                console.log(critical("Not firing subscription, before start of event."));
            }
        }

        callback();
    });
}

/* Weapon Grouping shizzle by Anioth */

var weaponMap = [];
var weapons;

function generate_weapons(callback)
{
    console.log("GENERATING WEAPONS!");

    cachePool.getConnection(function(poolErr, dbConnectionW)
    {
        if (poolErr)
        {
            throw(poolErr);
        }

        dbConnectionW.query("SELECT * FROM weapon_data", function(err, result)
        {
            if (err)
            {
                throw(err);
            }
            else
            {
                dbConnectionW.release();

                var weaponFilterMap = {};

                for (var i = result.length - 1; i >= 0; i--)
                {
                    //console.log(result[i]);
                    var weapon = result[i];
                    if (weaponFilterMap.hasOwnProperty(weapon.weaponName)) {
                        weaponMap[weapon.weaponID] = {"id": weaponFilterMap[weapon.weaponName]};
                    } else {
                        weaponFilterMap[weapon.weaponName] = weapon.weaponID;
                        weaponMap[weapon.weaponID] = {"id": weapon.weaponID};
                    }
                }

                // Use the map to find a group
                //console.log("%j", weaponMap);

                //console.log("Looking for weapon id 1 %j", weaponMap[1]);

                callback();
            }
        });
    });
}


var combatHistoryProcessed = {};

function combatHistory() // Called by generateActives function to log active alert history
{
    var date = new Date();
    var time = date.getTime();
    time = time / 1000; // Convert to websocket / PHP times

    if (messagesRecieved > 1)
    {
        console.log(success("=========== GENERATING COMBAT HISTORY ==============="));

        pool.getConnection(function(poolErr, dbConnectionH)
        {
            if (poolErr)
            {
                throw(poolErr);
            }

            Object.keys(instances).forEach(function(key)
            {
                var resultID = instances[key].resultID;

                dbConnectionH.query("SELECT * FROM ws_factions WHERE resultID="+resultID, function(err, result)
                {
                    if (result[0]) // If got a record
                    {
                        var total = parseInt(result[0].killsVS + result[0].killsNC + result[0].killsTR);

                        if (total !== 0)
                        {
                            var post =
                            {
                                resultID: resultID,
                                timestamp: time,
                                killsVS: result[0].killsVS,
                                killsNC: result[0].killsNC,
                                killsTR: result[0].killsTR
                            };

                            sendResult("combatHistory", post, resultID);

                            dbConnectionH.query("INSERT INTO ws_combat_history SET ?", post, function(err, result)
                            {
                                if (err)
                                {
                                    if (err.errno !== 1213 && err.errno !== 1062) // If a deadlock or a duplicate
                                    {
                                        reportError(err, "Insert Combat Record");
                                    }
                                }

                                if (config.debug.status === true)
                                {
                                console.log(success("Inserted Combat History for Alert #"+resultID));
                                }
                            });
                        }
                    }
                    else
                    {
                    console.log(critical("UNABLE TO RETRIEVE KILL COMBAT HISTORY FOR ALERT #"+resultID));
                    }
                });
            });

            console.log(notice("Combat History Logged - "+date));

            dbConnectionH.release();
        });
    }
}

function handleDeadlock(query, location, tries)
{
    tries = tries++;

    if (tries < 20)
    {
        var rand = Math.random() * (1000 - 250) + 250;

        setTimeout(function()
        {
            pool.getConnection(function(poolErr, dbConnectionLoop)
            {
                dbConnectionLoop.query(query, function(err, result)
                {
                    if (err)
                    {
                        if (err.errno === 1213) // If deadlock
                        {
                            handleDeadlock(query, location, tries); // Call upon itself to try again.
                        }
                    }

                    if (result)
                    {
                        if (result.affectedRows > 0)
                        {
                            console.log(warning("Deadlock / Duplicate handled! Location: "+location));
                        }
                    }
                    else
                    {
                        reportError(query, "ERROR HANDLING DEADLOCK @ LOCATION: "+location);
                        console.log(query);
                    }
                    dbConnectionLoop.release();
                });
            });
        }, rand);
    }
    else
    {
        console.log(critical("DEADLOCK WAS HANDLED, BUT ERRORED."));
        console.log(critical("LOCATION: "+location));
    }
}

function getMapSnapshot(world, zone)
{

}

/* Structure

messagesDuplicates =
{
    Combat :
    {
        123456789 : (timestamp)
        {
            54564545454545 (victim)
        }
    }
    Facility :
    {
        1 :(world ID)
        {
            2 : (zone)
            {
                200100 : (facilityID)
                {
                    123456789
                }
            }
        }
    }
    VehicleDestroy :
    {
        123456789 : (timestamp)
        {
            5546454545454 (victim)
        }
    }
}

if VictimID exists within combat message, discard the message


SAMPLE MESSAGE

FacilityMessage:
{
    "facility_id":"254030",
    "facility_type_id":"6",
    "outfit_id":"0",
    "duration_held":"52",
    "new_faction_id":"1",
    "old_faction_id":"2",
    "is_capture":"0",
    "control_vs":"44",
    "control_nc":"54",
    "control_tr":"1",
    "timestamp":"1424620307",
    "zone_id":"8",
    "world_id":"19"
    "event_type":"FacilityControl"
}
*/

var messagesDuplicates = {};

setInterval(function()
{
    messagesDuplicates = {};
}, 2000);

function checkDuplicateMessages(message, callback)
{
    if (config.debug.duplicates)
    {
        console.log(warning("CHECKING FOR DUPLICATES START"));
        console.log(warning(JSON.stringify(message, null, 4)));
    }

    if (messagesDuplicates["Combat"] === undefined)
    {
        messagesDuplicates["Combat"] = {};
    }
    if (messagesDuplicates["FacilityControl"] === undefined)
    {
        messagesDuplicates["FacilityControl"] = {};
    }
    if (messagesDuplicates["VehicleDestroy"] === undefined)
    {
        messagesDuplicates["VehicleDestroy"] = {};
    }
    if (messagesDuplicates["MetagameEvent"] === undefined)
    {
        messagesDuplicates["MetagameEvent"] = {};
    }
    if (messagesDuplicates["ExperienceEarned"] === undefined)
    {
        messagesDuplicates["ExperienceEarned"] = {};
    }
    if (messagesDuplicates["AchievementEarned"] === undefined)
    {
        messagesDuplicates["AchievementEarned"] = {};
    }
    if (messagesDuplicates["PopulationChange"] === undefined)
    {
        messagesDuplicates["PopulationChange"] = {};
    }

    if (message.event_type !== undefined)
    {
        var eventType = message.event_type;

        if (config.debug.duplicates === true)
        {
            console.log(warning("CHECKING FOR DUPLICATES"));
        }

        var status = false; // Duplicate unless proven otherwise

        if (eventType == "Combat")
        {
            var timestamp = message.payload.timestamp;
            var victimID = message.payload.victim_character_id;

            if (config.debug.duplicates === true)
            {
                console.log(warning("Checking Victim: "+victimID+" for duplicates"));
            }

            if (messagesDuplicates.Combat[victimID] === undefined)
            {
                messagesDuplicates.Combat[victimID] =
                {
                    timestamp: timestamp
                };

                status = true;
            }
            else if (messagesDuplicates.Combat[victimID].timestamp === timestamp) // If a duplicate based off timestamp
            {
                status = false;
            }
        }
        else if (eventType === "FacilityControl")
        {
            var timestamp = message.payload.timestamp;
            var facilityID = message.payload.facility_id;
            var blockUpdate = message.payload.is_block_update;

            if (config.debug.duplicates === true)
            {
                console.log(warning("Checking Facility: "+facilityID+" for duplicates"));
            }

            if (blockUpdate === "1") {
                status = true;
            } else {
                if (messagesDuplicates.FacilityControl[facilityID] === undefined)
                {
                    messagesDuplicates.FacilityControl[facilityID] =
                    {
                        timestamp: timestamp
                    };

                    status = true;
                }
                else if (messagesDuplicates.FacilityControl[facilityID].timestamp == timestamp) // If a duplicate based off timestamp
                {
                    status = false;
                }
            }
        }
        else if (eventType == "VehicleDestroy")
        {
            var timestamp = message.payload.timestamp;
            var victimID = message.payload.victim_character_id;

            if (config.debug.duplicates === true)
            {
                console.log(warning("Checking Vehicle Victim: "+victimID+" for duplicates"));
            }

            if (messagesDuplicates.VehicleDestroy[victimID] === undefined)
            {
                messagesDuplicates.VehicleDestroy[victimID] =
                {
                    timestamp: timestamp
                }

                status = true;
            }
            else if (messagesDuplicates.VehicleDestroy[victimID].timestamp == timestamp) // If a duplicate based off timestamp
            {
                status = false;
            }
        }
        else if (eventType == "MetagameEvent")
        {
            var timestamp = message.payload.timestamp;
            var worldID = message.payload.world_id;
            var zoneID = message.payload.zone_id;
            var status = message.payload.status;

            console.log(status);

            if (config.debug.duplicates === true)
            {
                console.log(warning("Checking Alerts for World "+worldID+" for duplicates"));
            }

            /*if (status != 2)
            {
                status = true;
            }
            // Otherwise, if updates
            else if (messagesDuplicates.MetagameEvent[worldID] === undefined)
            {
                messagesDuplicates.MetagameEvent[worldID] = {};

                if (messagesDuplicates.MetagameEvent[worldID][zoneID] === undefined)
                {
                    messagesDuplicates.MetagameEvent[worldID][zoneID] = {
                        world: worldID,
                        zone: zoneID
                    };
                }

                status = true;
            }
            else if (messagesDuplicates.MetagameEvent[worldID][zoneID].world == worldID && messagesDuplicates.MetagameEvent[worldID][zoneID].zone == zoneID)
            // If a duplicate based off presense of the object
            {
                status = false;
            }*/

            status = true;
        }
        else if (eventType == "ExperienceEarned")
        {
            status = true;
        }
        else if (eventType == "AchievementEarned")
        {
            status = true;
        }
        else if (eventType == "PopulationChange")
        {
            var timestamp = message.payload.timestamp;
            var worldID = message.payload.world_id;
            var zoneID = message.payload.zone_id;

            /*if (config.debug.duplicates === true)
            {
                console.log(warning("Checking Populations for World "+worldID+" for duplicates"));
            }

            if (messagesDuplicates.PopulationChange[worldID] == undefined)
            {
                messagesDuplicates.PopulationChange[worldID] =
                {
                    world: worldID,
                    zone: zoneID
                }

                status = true;
            }
            else if (messagesDuplicates.PopulationChange[worldID].world == worldID && messagesDuplicates.PopulationChange[worldID].zone == zoneID) // If a duplicate based off presense
            {
                status = false;
            }*/

            status = true;
        }
        else if (eventType == "ServiceStateChange")
        {
            status = true;
        }
    }
    else // If the message doesn't have an event type, let it through.
    {
        status = true;
    }

    callback(status);
}

function calcEndTime(started, type) // Calculates estimated end time of an alert based off type and start time
{
    switch(type)
    {
        case "1":
        case "2":
        case "3":
        case "4":
        {
            var toAdd = 5400;
        }
    }

    var endtime = parseInt(started) + toAdd;

    return endtime;
}

// =================== SERVER ===============================

var clientConnections = {}; //Stores all connections to this server, and their subscribed events.
var connectionIDCounter = 0; //Connection Unique ID's.

var clientAdminConnections = {}; //Stores all connections to this server, and their subscribed events.
var clientAdminPerfConnections = {}; //Stores all connections to this server, and their subscribed events.

var resultSubscriptions = {}; // Stores all connections on a per-alert basis

var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer(
{
    port: config.serverPort,
    clientTracking: false, //We do our own tracking.
});

wss.on('connection', function(clientConnection)
{
    if (config.debug.clients === true)
    {
        console.log("Processing incoming connection");
    }

    var apiKey = url.parse(clientConnection.upgradeReq.url, true).query.apikey;

    checkAPIKey(apiKey, function(isValid, username, admin)
    {
        if (config.debug.auth === true)
        {
            console.log("API Check Result: "+isValid);
        }

        if(isValid)
        {
            // Store a reference to the connection using an incrementing ID
            clientConnection.id = connectionIDCounter++;

            //Add to tracked client connections.
            clientConnections[clientConnection.id] = clientConnection;

            var message =
            {
                state: connectionState,
                admin: admin,
                response: 'auth'
            }

            clientConnection.send(JSON.stringify(message));

            if (config.debug.clients == true)
            {
                console.log(success("Websocket Connected - TOTAL: "+Object.keys(clientConnections).length));
                console.log((new Date()) + ' User ' + username + ' connected. API Key: ' + apiKey);
            }

            if (admin == true)
            {
                if (config.debug.admin == true)
                {
                    console.log(success("Admin successfuly authenticated!"));
                }

                clientAdminConnections[clientConnection.id] = clientConnection; // Subscribe admin to admin object
            }

            clientConnection.on('message', function(message)
            {
                try // Check if the message we get is valid json.
                {
                    var message = JSON.parse(message); //Messages Received From Census are Formated in JSON. Parse it, and you'll be able to access the data the same as a JSON object.
                    message = message.payload;
                }
                catch(exception)
                {
                    console.log(message);
                    console.log(critical("INVALID JSON RECIEVED"));

                    clientConnection.send('{"response":"Invalid Input"}');
                    message = null;
                }

                if (message) // If valid
                {
                    if (message.action == "subscribe") // Subscribe to result
                    {
                        var resultID = message.resultID;

                        if (!resultSubscriptions[resultID])
                        {
                            resultSubscriptions[resultID] = {};

                            resultSubscriptions[resultID][clientConnection.id] = clientConnection;
                        }
                        else
                        {
                            resultSubscriptions[resultID][clientConnection.id] = clientConnection; // Put connection based on resultID into object to loop through
                        }

                        if (config.debug.clients == true)
                        {
                            console.log(success("SUBSCRIBED WEBSOCKET TO ALERT #"+resultID));
                        }

                        clientConnection.send('{"response":"Subscribed"}');
                    }
                    else if (message.action == "timesync")
                    {
                        var clientTime = message.time;
                        var resultID = message.resultID;
                        var mode = message.mode;

                        if (config.debug.time === true)
                        {
                            console.log(notice("Time message recieved:"));
                            console.log(message);
                        }

                        if (instances[resultID]) // On first load stuff, prevent crash
                        {
                            if (config.debug.time === true)
                            {
                                console.log(critical("REQUESTED INSTANCE:"));
                                console.log(instances[resultID]);
                            }

                            var serverTime = new Date().getTime();
                            serverTime = Math.floor(serverTime / 1000);

                            if (config.debug.time === true)
                            {
                                console.log("SERVER TIME: "+serverTime);
                            }

                            var diff = ( parseInt(clientTime) - parseInt(serverTime) );

                            if (mode == "start")
                            {
                                var remaining = parseInt(instances[resultID].startTime) - serverTime;
                            }
                            else if (mode == "end")
                            {
                                var remaining = parseInt(instances[resultID].endTime) - serverTime;
                            }
                            else if (mode === undefined)
                            {
                                var remaining = "MODE NOT SELECTED!";
                            }

                            //console.log(notice("Recieved Timesync message"));

                            clientConnection.send('{"response":"time", "serverTime": '+serverTime+', "clientTime": '+clientTime+', "remaining": '+remaining+', "timediff":'+diff+'}');

                            if (config.debug.time === true)
                            {
                                console.log(success("SENDING TIME MESSAGE"));
                            }
                        }
                        else
                        {
                            if (config.debug.time === true)
                            {
                                console.log(critical("SENDING TIMESYNC WAIT MESSAGE"));
                            }

                            clientConnection.send('{"response":"timeWait"}');
                        }
                    }
                    else if (message.action == "alertStatus") // First call for the monitor
                    {
                        var messageToSendMonitor = {};

                        messageToSendMonitor.messageType = "alertStatus";

                        var activeAlertsReply = {};

                        var serverTime = new Date().getTime();
                        serverTime = Math.floor(serverTime / 1000);

                        Object.keys(instances).forEach(function(key)
                        {
                            var world = instances[key]['world'];
                            var zone = instances[key]['zone'];

                            if(instances[key].status == true) // If theres an active alert
                            {
                                if (!activeAlertsReply[world])
                                {
                                    activeAlertsReply[world] = {};
                                }

                                activeAlertsReply[world][zone] = {};
                                activeAlertsReply[world][zone] = instances[key];

                                var remaining = parseInt(instances[key].endTime) - serverTime;

                                activeAlertsReply[world][zone].remaining = remaining;
                                activeAlertsReply[world][zone].serverTime = serverTime;
                            }
                        });

                        messageToSendMonitor.data = activeAlertsReply;

                        clientConnection.send(JSON.stringify(messageToSendMonitor));

                        if (config.debug.clients == true)
                        {
                            console.log(messageToSendMonitor);
                            console.log("SENT WEBSOCKET MONITOR CURRENT STATUS");
                        }
                    }

                    /*else if (message.action == "unsubscribe") // unSubscribe from result
                    {
                        console.log(resultSubscriptions);
                        var resultID = message.resultID;

                        if (resultSubscriptions[resultID][clientConnection.id])
                        {
                            delete resultSubscriptions[resultID][clientConnection.id]; // Put connection based on resultID into object to loop through
                        }

                        console.log(success("UNSUBSCRIBED WEBSOCKET FROM ALERT #"+resultID));

                        clientConnection.send('{"response":"Unsubscribed"}');
                    }*/

                    // ADMIN FUNCTIONS //

                    else if (message.type == "subscribePerf" && admin == true) // Admin functions
                    {
                        clientAdminPerfConnections[clientConnection.id] = clientConnection;
                    }
                    else if (message.type == "reloadPages" && admin == true)
                    {
                        var resultID = message.resultID;

                        sendResult("reload", "reload", resultID);
                    }

                    // End of message actions
                }
            }); // End of clientOnMessage
        } // End of API Key if
        else // If API key is not valid or not authorised
        {
            if (apiKey != undefined)
            {
                console.log(critical("UNAUTHORISED API KEY ATTEMPT! "+apiKey));
                console.log(critical(JSON.stringify(message, null, 4)));
            }
            else
            {
                if (config.debug.auth == true)
                {
                    console.log(critical("INVALID API KEY FORMAT DETECTED."));
                    console.log(critical("API KEY: "+apiKey));
                }
            }

            clientConnection.close();
        }

        clientConnection.on('close', function(code, message)
        {
            delete clientConnections[clientConnection.id];

            if (clientAdminConnections[clientConnection.id])
            {
                delete clientAdminConnections[clientConnection.id];
            }

            if (apiKey != undefined)
            {
                if (config.debug.clients === true)
                {
                    console.log(notice("Websocket connection closed - Total: "+Object.keys(clientConnections).length));
                }
            }
        });
    }); // End of check API key
});

/**
 * Interval functions which fire maintenance tasks or required operations
 */
setInterval(function()
{
    usage.lookup(pid, function(err, result) {
        perfSecs++;
        if (result !== undefined)
        {
            var memory = Math.round(result.memory / 1024 / 1024);
            var cpu = Math.round(result.cpu);
            var conns = Object.keys(clientConnections).length;

            if (config.debug.perf === true && perfSecs === 30)
            {
                console.log(notice("============== PERFORMANCE =============="));
                console.log("CPU: "+cpu+"% - MEM: "+memory+"MB - Conns: "+conns);
                console.log(notice("========================================="));

                perfSecs = 0;
            }

            perfStats =
            {
                "cpu": cpu,
                "mem": memory,
                "conns": conns,
                "msgSec": messagesRecievedSec,
                "msgLast": messagesRecievedLast * 2,
                "state": connectionState,
            };

            sendAdmins("perf", perfStats);

            messagesRecievedSec = 0;
        }
    });
}, 1000);

cleanCache();

/**
 * Cleans the cache store of all old data every 60 seconds
 *
 * @see cleanCache
 *
 */
setInterval(function()
{
    cleanCache();
}, 60000);

//Connection Watcher - Reconnects if websocket connection is dropped.
function conWatcher()
{
    if(!wsClient.isConnected())
    {
        console.log(critical('Reconnecting...'));

        var connectionState = 2;

        var message =
        {
            state: connectionState,
            admin: false,
            response: 'auth'
        };

        sendAdmins("status", message);

        wsClient = new persistentClient();
    }
}

/**
 * Watches subscription states. If they were never recieved, we restart the socket client.
 */
function subWatcher()
{
    if(wsClient.isConnected())
    {
        if (subscriptions === 0) // If the socket doesn't get a response from the API when subscriptions have been sent
        {
            console.log(critical('SUBSCRIPTIONS NOT PASSED! RECONNECTING...'));
            subscriptionsRetry = 1;
            wsClient = new persistentClient();
        }
    }
}

/**
 * Cleans cache expiries out of the database
 *
 */
function cleanCache()
{
    console.log(notice("Running cache clean routine"));
    {
        cachePool.getConnection(function(err, dbConnectionClean)
        {
            if (err)
            {
                throw(err);
            }

            var expiry = Math.round(new Date().getTime() / 1000);

            dbConnectionClean.query("DELETE FROM outfit_cache WHERE expires <= "+expiry, function(err, result)
            {
                if (err) { throw(err); }

                console.log("Outfit cache cleaned. Removed: "+result.affectedRows);
            });

            dbConnectionClean.query("DELETE FROM player_cache WHERE expires <= "+expiry, function(err, result)
            {
                if (err) { throw(err); }

                console.log("Player cache cleaned. Removed: "+result.affectedRows);
            });

            dbConnectionClean.release();
        });
    }
}

var maintTimer = 30 * 1000;
var maintenance = setInterval(function()
{
    if (config.debug.status === true && messagesRecieved > 5)
    {
        console.log(notice("TOTAL MESSAGES RECIEVED (1 min): "+messagesRecieved));
    }

    combatHistory();// Log combat history for active alerts

    messagesRecieved = 0;
    messagesRecievedLast = messagesRecieved;

    checkInstances(function()
    {
        if (config.debug.instances === true)
        {
            if (instances.length > 0)
            {
                console.log(notice("=========== CURRENT ALERTS IN PROGRESS: ==========="));
                console.log(instances);
            }
        }
    });

    checkMapInitial(function()
    {
        console.log(notice("Map inital checked"));
    });

}, maintTimer);

setInterval(function() {
    var actives = '{"action":"activeMetagameEvents"}'; // Pull a list of all active alerts

    try {
        client.send(actives);
    } catch (e) {
        reportError("Error: "+e, "Metagame Active Alerts message failed", true);
    }
}, 30000 );

function processActives(message) {
    var data = message.worlds;

    if (config.debug.sync === true) {
        console.log(JSON.stringify(instances, null, 4));
    }

    Object.keys(data).forEach(function(world) {
        Object.keys(data[world].metagame_events).forEach(function(a) {

            var instanceFound = false;
            var alert = data[world].metagame_events[a];
            var instanceID = alert.instance_id;

            if (config.debug.sync === true) {
                console.log("Instance ID", instanceID);
            }

            // Check for the instanceID in the instances object
            Object.keys(instances).forEach(function(w) {
                if (instances[w].instanceID == instanceID) {

                    if (config.debug.sync == true) {
                        console.log(success("Alert found"));
                        console.log(notice(JSON.stringify(instances[w], null, 4)));
                    }

                    instanceFound = true;
                }
            });

            // If instance was not found, force start
            if (instanceFound === false) {
                reportError("Sync detected missed alert! World: "+ world, "Instance Sync");

                delete alert.facilities;

                if (config.debug.sync === true) {
                    console.log(critical(JSON.stringify(alert, null, 4)));
                }

                /**
                 * message = {
                 * 		world_id,
                 * 		zone_id,
                 * 		metagame_event_type_id,
                 * 		start_time,
                 * 		control_vs,
                 * 		control_nc,
                 * 		control_tr,
                 * 		instance_id
                 * }
                 */

                alert.world_id = world;

                pool.getConnection(function(err, dbConnection) {
                    insertAlert(alert, dbConnection, function(resultID) {
                        console.log(success("================ FORCE STARTED NEW ALERT #"+resultID+" ("+supplementalConfig.worlds[world]+") ================"));
                    });

                    dbConnection.release();
                });
            }
        });
    });
};
