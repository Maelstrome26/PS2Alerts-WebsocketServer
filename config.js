(function () {
   'use strict';

   const userconfig = require('./config.user.js');

   let config = {
       censusServiceId: userconfig.censusServiceId,
       extendedAPIKey: userconfig.extendedAPIKey,
       serverPort: userconfig.serverPort,
       database : userconfig.database,
       redis: userconfig.redis,
       allowedDebug: [ // Debug message keys that are allowed to be shown
           'websocket:heartbeat',
           //'messageProcessor:executePlayerUpdate'
       ],
       statusMessages: {
           census: true
       },
       supplementalConfig: {
           worlds : {
               1: 'Connery',
               10: 'Miller',
               13: 'Cobalt',
               17: 'Emerald',
               19: 'Jaeger',
               25: 'Briggs',
               1000: 'Genudine (PS4US)',
               1001: 'Palos (PS4US)',
               1002: 'Crux (PS4US)',
               1003: 'Searhus (PS4US)',
               1004: 'Xelas (PS4US)',
               2000: 'Ceres (PS4EU)',
               2001: 'Lithcorp (PS4EU)',
               2002: 'Rashnu (PS4EU)'
           },
           pcWorlds: [1,10,13,17,25],
           ps4usWorlds: [1000, 1001],
           ps4euWorlds: [2000, 2001],
       },

       // Smalls = Modules
       // Mediums = Turrets & Gates
       // Larges = Walls, Bunkers & Silos
       // UNASSIGNED: // HIVE Explosion Kill (Source) **POSSIBLE?** ** MAYBE **
       // SOURCE: Defending HIVE (player faction)
       // TARGET: Attacking HIVE (not player facition)
       // RANGE: 100meters
       //
       constructionTypes: [
           604, // Medium Kills
           605, // Medium Squad Repair
           606, // Medium Repair
           607, // Medium Kill Assist
           609, // Medium Spot Kill
           610, // Medium Squad Spot Kill
           616, // Small Kills
           617, // Small Squad Repair
           618, // Small Repair
           619, // Small Kill Assist
           621, // Small Spot Kill
           622, // Small Squad Spot Kill
           628, // Large Kill
           629, // Large Squad Repair
           630, // Large Repair
           631, // Large Kill Assist
           633, // Large Spot Kill
           634, // Large Squad Spot Kill
           639, // HIVE Core Vehicle Ram Kill **POSSIBLE?** (I will be amazed if anyone gets one)
           640, // HIVE Core Kill
           641, // HIVE Core Squad Repair **POSSIBLE??**
           642, // HIVE Core Repair **POSSIBLE??**
           643, // HIVE Core Kill Assist (After shield is down)
           645, // HIVE Core Squad Spot Kill **POSSIBLE?**
           651, // ANT Destruction
           652, // ANT Vehicle Ram Kill
           653, // ANT Repair
           654, // ANT Kill Assist
           656, // ANT Squad Repair
           663, // ANT Spot Kill
           664, // ANT Squad Spot Kill
           674, // Cortium Harvest
           675, // Cortium Deposit
           693, // Kill Player - HIVE XP (Source)
           694, // Ditto (Target)
           697, // Heal near HIVE?
           699, // Revie near HIVE?
           707, // Resupply player near HIVE?
           710, // Heal near HIVE (Target)
           712, // Revive near HIVE (Target)
           720, // Resupply player near HIVE (Target)
           1016, // Tank mine diffusal HIVE XP (Source)
           1036, // Tank mine diffusal HIVE XP (Target)
           1232, // Medium Kill HIVE XP (Target)
           1233, // Medium Squad Repair HIVE XP (Target)
           1234, // Medium Repair HIVE XP (Target)
           1235, // Medium Kill Assist HIVE XP (Target)
           1237, // Medium Spot Kill Assist HIVE XP (Source)
           1243, // Small Kill HIVE XP (Source)
           1244, // Small Squad Repair HIVE XP (Source)
           1245, // Small Repair HIVE XP (Source)
           1246, // Small Kill Assist HIVE XP (Source)
           1254, // Large Kill HIVE XP (Source)
           1255, // Medium Spot Kill (Target)
           1261, // Small Kill HIVE XP (Target)
           1262, // Small Squad Repair HIVE XP (Target)
           1263, // Small Repair HIVE XP (Target)
           1264, // Small Kill Assist HIVE XP (Target)
           1266, // Small Spot Kill HIVE XP (Target)
           1273, // Large Repair HIVE XP (Source)
           1274, // Large Kill Assist HIVE XP (Source)
           1276, // Spot Kill Assist HIVE XP (Source)
           1282, // HIVE Core Kill HIVE XP (Source)
           1283, // HIVE Core Repair (Source) **POSSIBLE?**
           1284, // HIVE Core Kill Assist HIVE XP (Source)
           1286, // HIVE Core Spot Kill HIVE XP (Source)
           1289, // Large Repair HIVE XP (Target)
           1290, // Large Kill Assist HIVE XP (Target)
           1292, // Large Spot Kill HIVE XP (Target)
           1297, // HIVE Core Vehicle Ram HIVE XP (Target) **POSSIBLE?**
           1298, // HIVE Core Kill HIVE XP (Target)
           1299, // HIVE Core Repair (Target) **POSSIBLE??**
           1300, // HIVE Core Kill Assist (Target)
           1302 // HIVE Core Spot Kill (Target) **POSSIBLE??**
       ],
       /*debugCharacters: [
           '5428245075223380049', // Maelstrome26Jaeger
           '5428010618035323201', // Maelstrome26
           '8278165418342808801', // CplSkeptic
           '5428366106637502001', // FarmerOfTheCrops
           '5428392193616773633' // Maelstrome26JaegerNC
       ]*/
   };

   module.exports = config;
}());
