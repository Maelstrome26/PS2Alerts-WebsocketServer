var events = {};

function setMatchInstances(data, dbConnectionCheck)
{
    var controlVS = "DUNNO";
    var controlNC = "DUNNO";
    var controlTR = "DUNNO";

    dbConnectionCheck.query("SELECT * FROM ws_instances WHERE resultID = "+data.resultID, function(err, result)
    {
        if (result.controlVS !== undefined)
        {
            controlVS = result.controlVS;
            controlNC = result.controlNC;
            controlTR = result.controlTR;

            if (config.debug.upcoming === true)
            {
                console.log("Found control % from instance");
            }
        }
        else
        {
            dbConnectionCheck.query("SELECT * FROM ws_map WHERE resultID = "+data.resultID+", ORDER BY dataID DESC LIMIT 1", function(err, result)
            {
                if (result)
                {
                    controlVS = result[0].controlVS;
                    controlNC = result[0].controlNC;
                    controlTR = result[0].controlTR;

                    if (config.debug.upcoming === true)
            {
                        console.log(success("Found control % from map"));
                    }
                }
                else
                {
                    if (config.debug.upcoming === true)
                    {
                        console.log("Falling back on defaults");
                    }

                    controlVS = 33;
                    controlNC = 33;
                    controlTR = 33;

                    if (config.debug.upcoming === true)
                    {
                        console.log(notice("Instances set"));
                        console.log(instances[data.resultID]);
                    }
                }
            });
        }

        instances[data.resultID] = {};

        instances[data.resultID].status = true;
        instances[data.resultID].resultID = data.resultID;
        instances[data.resultID].startTime = parseInt(data.startTime);
        instances[data.resultID].endTime = parseInt(data.endTime);
        instances[data.resultID].type = data.type;
        instances[data.resultID].world = data.world;
        instances[data.resultID].zone = data.zone;
        instances[data.resultID].controlVS = controlVS;
        instances[data.resultID].controlNC = controlNC;
        instances[data.resultID].controlTR = controlTR;
    });
}

function hydrateResult(resultID)
{
    console.log("HYDRATING RESULT: "+resultID);

     var options = {
        hostname: "dev.ps2alerts.com",
        port: 80,
        method: 'GET',
        path: '/alert/'+resultID
    };

    var req = http.request(options, function()
    {
        req.end();

        console.log(success("SUCCESSFULLY HYDRATED ALERT #"+resultID));
    });

    req.on('error', function(e) {
        console.error(e);
    });
}
