CREATE DATABASE  IF NOT EXISTS `ps2alertsWS` /*!40100 DEFAULT CHARACTER SET latin1 */;
USE `ps2alertsWS`;
-- MySQL dump 10.13  Distrib 5.6.24, for osx10.8 (x86_64)
--
-- Host: 85.159.214.60    Database: ps2alertsWS
-- ------------------------------------------------------
-- Server version	5.5.5-10.0.20-MariaDB-1~trusty

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `stats_ads`
--

DROP TABLE IF EXISTS `stats_ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stats_ads` (
  `ResultID` int(11) NOT NULL,
  `Date` datetime NOT NULL,
  `TimeType` varchar(10) NOT NULL,
  `Server` int(2) NOT NULL,
  `ScoreVS` int(4) NOT NULL,
  `ScoreNC` int(4) NOT NULL,
  `ScoreTR` int(4) NOT NULL,
  `VSPop` varchar(5) NOT NULL,
  `NCPop` varchar(5) NOT NULL,
  `TRPop` varchar(5) NOT NULL,
  `XPVS` int(5) NOT NULL,
  `XPNC` int(5) NOT NULL,
  `XPTR` int(5) NOT NULL,
  PRIMARY KEY (`ResultID`),
  KEY `Date` (`Date`),
  KEY `TimeType` (`TimeType`),
  CONSTRAINT `stats_ads_ibfk_1` FOREIGN KEY (`ResultID`) REFERENCES `results2` (`ResultID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_achievements`
--

DROP TABLE IF EXISTS `ws_achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_achievements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `playerID` binary(19) NOT NULL,
  `resultID` mediumint(9) NOT NULL,
  `achievementID` mediumint(9) NOT NULL,
  `occurances` smallint(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQUE` (`playerID`,`resultID`,`achievementID`),
  KEY `resultID` (`resultID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_classes`
--

DROP TABLE IF EXISTS `ws_classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_classes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `resultID` mediumint(9) NOT NULL,
  `classID` tinyint(2) NOT NULL,
  `kills` smallint(5) NOT NULL DEFAULT '0',
  `deaths` smallint(5) NOT NULL DEFAULT '0',
  `teamkills` smallint(5) NOT NULL DEFAULT '0',
  `suicides` smallint(5) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `resultClass` (`resultID`,`classID`),
  KEY `resultID` (`resultID`),
  KEY `classID` (`classID`)
) ENGINE=InnoDB AUTO_INCREMENT=86763 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_classes_totals`
--

DROP TABLE IF EXISTS `ws_classes_totals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_classes_totals` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `resultID` mediumint(9) NOT NULL,
  `playerID` binary(19) NOT NULL,
  `classID` tinyint(2) NOT NULL,
  `kills` smallint(3) DEFAULT '0',
  `deaths` smallint(3) DEFAULT '0',
  `teamkills` smallint(3) DEFAULT '0',
  `suicides` smallint(3) DEFAULT '0',
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `playerClassResult` (`resultID`,`playerID`,`classID`),
  KEY `resultIDIndex` (`resultID`)
) ENGINE=InnoDB AUTO_INCREMENT=7496181 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_combat`
--

DROP TABLE IF EXISTS `ws_combat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_combat` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` int(11) NOT NULL,
  `resultID` mediumint(9) DEFAULT NULL,
  `worldID` tinyint(2) NOT NULL,
  `attackerID` varchar(20) DEFAULT NULL,
  `attackerName` tinytext,
  `attackerOutfit` varchar(20) DEFAULT NULL,
  `attackerFaction` tinyint(1) DEFAULT NULL,
  `attackerLoadout` tinyint(4) DEFAULT NULL,
  `victimID` varchar(20) DEFAULT NULL,
  `victimName` tinytext,
  `victimOutfit` varchar(20) DEFAULT NULL,
  `victimFaction` tinyint(1) DEFAULT NULL,
  `victimLoadout` tinyint(4) DEFAULT NULL,
  `weaponID` smallint(6) DEFAULT NULL,
  `vehicleID` tinyint(4) DEFAULT NULL,
  `headshot` tinyint(1) DEFAULT NULL,
  `zone` tinyint(2) DEFAULT NULL,
  `teamkill` tinyint(1) DEFAULT NULL,
  `suicide` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`dataID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_combat_history`
--

DROP TABLE IF EXISTS `ws_combat_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_combat_history` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `resultID` mediumint(9) NOT NULL,
  `timestamp` int(10) NOT NULL,
  `killsVS` mediumint(5) NOT NULL,
  `killsNC` mediumint(5) NOT NULL,
  `killsTR` mediumint(5) NOT NULL,
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `resultTimestamp` (`resultID`,`timestamp`)
) ENGINE=InnoDB AUTO_INCREMENT=2633598 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_disruption`
--

DROP TABLE IF EXISTS `ws_disruption`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_disruption` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `started` int(12) NOT NULL,
  `ended` int(12) NOT NULL,
  `world` smallint(4) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2922 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_errors`
--

DROP TABLE IF EXISTS `ws_errors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_errors` (
  `errorID` int(11) NOT NULL AUTO_INCREMENT,
  `errorReturned` text,
  `errorLocation` text,
  `time` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`errorID`)
) ENGINE=InnoDB AUTO_INCREMENT=42165 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_events`
--

DROP TABLE IF EXISTS `ws_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_events` (
  `resultID` int(11) NOT NULL,
  `world` int(2) DEFAULT NULL,
  `outfit` varchar(45) DEFAULT '0',
  `starts` varchar(45) NOT NULL,
  `ends` varchar(45) NOT NULL,
  PRIMARY KEY (`resultID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_factions`
--

DROP TABLE IF EXISTS `ws_factions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_factions` (
  `resultID` mediumint(9) NOT NULL,
  `killsVS` mediumint(9) DEFAULT NULL,
  `killsNC` mediumint(9) DEFAULT NULL,
  `killsTR` mediumint(9) DEFAULT NULL,
  `deathsVS` mediumint(9) DEFAULT NULL,
  `deathsNC` mediumint(9) DEFAULT NULL,
  `deathsTR` mediumint(9) DEFAULT NULL,
  `teamKillsVS` mediumint(9) DEFAULT NULL,
  `teamKillsNC` mediumint(9) DEFAULT NULL,
  `teamKillsTR` mediumint(9) DEFAULT NULL,
  `suicidesVS` mediumint(9) DEFAULT NULL,
  `suicidesNC` mediumint(9) DEFAULT NULL,
  `suicidesTR` mediumint(9) DEFAULT NULL,
  `totalKills` mediumint(9) DEFAULT NULL,
  `totalDeaths` mediumint(9) DEFAULT NULL,
  `totalTKs` mediumint(9) DEFAULT NULL,
  `totalSuicides` mediumint(9) DEFAULT NULL,
  PRIMARY KEY (`resultID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_instances`
--

DROP TABLE IF EXISTS `ws_instances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_instances` (
  `resultID` mediumint(9) NOT NULL,
  `instanceID` mediumint(9) NOT NULL,
  `world` smallint(4) NOT NULL,
  `zone` tinyint(4) NOT NULL,
  `started` int(20) NOT NULL,
  `endtime` int(20) NOT NULL,
  `type` int(3) NOT NULL,
  `controlVS` int(3) DEFAULT '0',
  `controlNC` int(3) DEFAULT '0',
  `controlTR` int(3) DEFAULT '0',
  PRIMARY KEY (`resultID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_map`
--

DROP TABLE IF EXISTS `ws_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_map` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `resultID` mediumint(9) NOT NULL,
  `timestamp` int(11) NOT NULL,
  `facilityID` mediumint(9) NOT NULL,
  `facilityOwner` tinyint(4) NOT NULL,
  `facilityOldOwner` tinyint(1) DEFAULT NULL,
  `durationHeld` mediumint(9) DEFAULT NULL,
  `defence` tinyint(1) NOT NULL,
  `controlVS` tinyint(3) NOT NULL,
  `controlNC` tinyint(3) NOT NULL,
  `controlTR` tinyint(3) NOT NULL,
  `zone` tinyint(2) NOT NULL,
  `world` smallint(4) NOT NULL,
  `outfitCaptured` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `Timestamp_Result_Facility` (`resultID`,`timestamp`,`facilityID`)
) ENGINE=InnoDB AUTO_INCREMENT=1951924 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_map_initial`
--

DROP TABLE IF EXISTS `ws_map_initial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_map_initial` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `resultID` mediumint(9) DEFAULT NULL,
  `worldID` tinyint(2) DEFAULT NULL,
  `zoneID` tinyint(2) DEFAULT NULL,
  `facilityID` int(11) DEFAULT NULL,
  `facilityTypeID` int(11) DEFAULT NULL,
  `facilityOwner` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`dataID`)
) ENGINE=InnoDB AUTO_INCREMENT=266310 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_outfits`
--

DROP TABLE IF EXISTS `ws_outfits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_outfits` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `resultID` mediumint(9) NOT NULL DEFAULT '0',
  `outfitID` varchar(20) NOT NULL,
  `outfitName` varchar(250) NOT NULL,
  `outfitTag` varchar(5) DEFAULT NULL,
  `outfitFaction` tinyint(4) NOT NULL,
  `outfitKills` smallint(5) NOT NULL,
  `outfitDeaths` smallint(5) NOT NULL,
  `outfitTKs` smallint(5) NOT NULL,
  `outfitSuicides` smallint(5) NOT NULL,
  `outfitCaps` mediumint(9) DEFAULT '0',
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `UniqueResultOutfit` (`resultID`,`outfitID`),
  KEY `outfitID` (`outfitID`),
  KEY `resultIDIndex` (`resultID`),
  KEY `outfitResult` (`resultID`,`outfitID`)
) ENGINE=InnoDB AUTO_INCREMENT=2573467 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_outfits_total`
--

DROP TABLE IF EXISTS `ws_outfits_total`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_outfits_total` (
  `outfitID` varchar(20) NOT NULL,
  `outfitName` varchar(32) NOT NULL,
  `outfitTag` varchar(5) DEFAULT NULL,
  `outfitFaction` tinyint(1) NOT NULL,
  `outfitKills` int(8) NOT NULL,
  `outfitDeaths` int(8) NOT NULL,
  `outfitTKs` int(8) NOT NULL,
  `outfitSuicides` int(8) NOT NULL,
  `outfitServer` varchar(2) NOT NULL,
  `outfitCaptures` int(8) DEFAULT '0',
  PRIMARY KEY (`outfitID`),
  UNIQUE KEY `outfitID_UNIQUE` (`outfitID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_players`
--

DROP TABLE IF EXISTS `ws_players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_players` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `playerID` binary(19) NOT NULL,
  `resultID` mediumint(9) NOT NULL DEFAULT '0',
  `playerName` tinytext NOT NULL,
  `playerOutfit` varchar(20) DEFAULT '0',
  `playerFaction` tinyint(1) DEFAULT NULL,
  `playerKills` smallint(6) NOT NULL,
  `playerDeaths` smallint(6) NOT NULL,
  `playerTeamKills` smallint(6) NOT NULL,
  `playerSuicides` smallint(6) NOT NULL DEFAULT '0',
  `headshots` smallint(6) NOT NULL DEFAULT '0',
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `playerID` (`playerID`,`resultID`),
  KEY `resultID` (`resultID`)
) ENGINE=InnoDB AUTO_INCREMENT=12480076 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_players_total`
--

DROP TABLE IF EXISTS `ws_players_total`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_players_total` (
  `playerID` binary(19) NOT NULL,
  `playerName` varchar(24) NOT NULL,
  `playerOutfit` varchar(20) DEFAULT '0',
  `playerKills` int(11) NOT NULL,
  `playerDeaths` int(11) NOT NULL,
  `playerTeamKills` int(11) NOT NULL,
  `playerSuicides` int(11) NOT NULL,
  `playerFaction` tinyint(1) NOT NULL,
  `headshots` int(11) NOT NULL DEFAULT '0',
  `playerServer` tinyint(2) NOT NULL DEFAULT '0',
  PRIMARY KEY (`playerID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_pops`
--

DROP TABLE IF EXISTS `ws_pops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_pops` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `resultID` mediumint(9) NOT NULL,
  `timestamp` int(11) NOT NULL,
  `popsVS` smallint(4) NOT NULL DEFAULT '0',
  `popsNC` smallint(4) NOT NULL DEFAULT '0',
  `popsTR` smallint(4) NOT NULL DEFAULT '0',
  `popsTotal` smallint(4) NOT NULL DEFAULT '0',
  `worldID` tinyint(2) NOT NULL DEFAULT '0',
  `zoneID` tinyint(2) NOT NULL DEFAULT '0',
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `resultTimestamp` (`resultID`,`timestamp`),
  KEY `resultID` (`resultID`)
) ENGINE=InnoDB AUTO_INCREMENT=875000 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_recorded`
--

DROP TABLE IF EXISTS `ws_recorded`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_recorded` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `message` varchar(50000) NOT NULL,
  `type` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `dataID_UNIQUE` (`dataID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_results`
--

DROP TABLE IF EXISTS `ws_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_results` (
  `ResultID` mediumint(9) NOT NULL AUTO_INCREMENT,
  `instanceID` mediumint(9) DEFAULT NULL,
  `ResultStartTime` int(11) DEFAULT NULL,
  `ResultEndTime` int(11) DEFAULT NULL,
  `ResultDateTime` datetime DEFAULT NULL,
  `ResultServer` int(4) NOT NULL,
  `ResultTimeType` varchar(3) DEFAULT NULL,
  `ResultMajority` int(1) DEFAULT NULL,
  `ResultWinner` varchar(4) NOT NULL,
  `ResultDraw` int(1) DEFAULT NULL,
  `ResultAlertCont` tinyint(2) NOT NULL,
  `ResultAlertType` tinyint(1) NOT NULL,
  `ResultDomination` int(1) DEFAULT NULL,
  `Valid` tinyint(1) DEFAULT NULL,
  `InProgress` tinyint(1) DEFAULT '0',
  `event` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`ResultID`),
  UNIQUE KEY `ResultID_UNIQUE` (`ResultID`),
  UNIQUE KEY `ServerInstanceStartUnique` (`ResultStartTime`,`ResultServer`,`instanceID`),
  KEY `ResultServer` (`ResultServer`),
  KEY `ResultTimeType` (`ResultTimeType`),
  KEY `ResultWinner` (`ResultWinner`),
  KEY `ResultDomination` (`ResultDomination`),
  KEY `ResultAlertCont` (`ResultAlertCont`,`ResultAlertType`),
  KEY `Valid` (`Valid`)
) ENGINE=InnoDB AUTO_INCREMENT=12391 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_upcoming`
--

DROP TABLE IF EXISTS `ws_upcoming`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_upcoming` (
  `resultID` int(11) NOT NULL,
  `startTime` int(11) DEFAULT NULL,
  `endTime` int(11) DEFAULT NULL,
  `worldID` tinyint(2) NOT NULL,
  `zoneID` tinyint(2) DEFAULT NULL,
  `outfitID` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`resultID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_vehicles`
--

DROP TABLE IF EXISTS `ws_vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_vehicles` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `vehicleID` tinyint(4) NOT NULL,
  `playerID` binary(19) NOT NULL,
  `killCount` smallint(6) NOT NULL,
  `killICount` smallint(6) NOT NULL,
  `killVCount` smallint(6) NOT NULL,
  `deathCount` smallint(6) NOT NULL,
  `deathICount` smallint(6) NOT NULL,
  `deathVCount` smallint(6) NOT NULL,
  `bails` smallint(6) NOT NULL,
  `resultID` mediumint(9) NOT NULL,
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `UniqueVehicle` (`resultID`,`vehicleID`,`playerID`)
) ENGINE=InnoDB AUTO_INCREMENT=44001336 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_vehicles_totals`
--

DROP TABLE IF EXISTS `ws_vehicles_totals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_vehicles_totals` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `vehicleID` tinyint(4) DEFAULT NULL,
  `killCount` smallint(6) DEFAULT '0',
  `killICount` smallint(6) DEFAULT '0',
  `killVCount` smallint(6) DEFAULT '0',
  `deathCount` smallint(6) DEFAULT '0',
  `deathICount` smallint(6) DEFAULT '0',
  `deathVCount` smallint(6) DEFAULT '0',
  `bails` smallint(6) DEFAULT '0',
  `resultID` mediumint(9) DEFAULT NULL,
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `resultIndex` (`resultID`,`vehicleID`)
) ENGINE=InnoDB AUTO_INCREMENT=4527448 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_weapons`
--

DROP TABLE IF EXISTS `ws_weapons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_weapons` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `resultID` mediumint(9) NOT NULL DEFAULT '0',
  `playerID` binary(19) NOT NULL,
  `weaponID` mediumint(9) NOT NULL,
  `killCount` smallint(6) NOT NULL,
  `headshots` smallint(6) DEFAULT '0',
  `teamkills` smallint(6) DEFAULT '0',
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `resultID` (`resultID`,`weaponID`),
  KEY `playerID` (`playerID`),
  KEY `weaponID` (`weaponID`)
) ENGINE=InnoDB AUTO_INCREMENT=192977136 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_weapons_totals`
--

DROP TABLE IF EXISTS `ws_weapons_totals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_weapons_totals` (
  `dataID` int(11) NOT NULL AUTO_INCREMENT,
  `resultID` mediumint(9) NOT NULL DEFAULT '0',
  `weaponID` mediumint(9) NOT NULL,
  `killCount` smallint(6) NOT NULL,
  `headshots` smallint(6) DEFAULT '0',
  `teamkills` smallint(6) DEFAULT '0',
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `Weapon` (`resultID`,`weaponID`),
  UNIQUE KEY `dataID` (`dataID`),
  UNIQUE KEY `dataID_2` (`dataID`)
) ENGINE=InnoDB AUTO_INCREMENT=3179480 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_xp`
--

DROP TABLE IF EXISTS `ws_xp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_xp` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `playerID` binary(19) NOT NULL,
  `resultID` mediumint(9) NOT NULL,
  `type` smallint(3) NOT NULL,
  `occurances` smallint(4) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `resultTypePlayer` (`playerID`,`type`,`resultID`),
  KEY `resultID` (`resultID`),
  KEY `type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=28654187 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ws_xp_totals`
--

DROP TABLE IF EXISTS `ws_xp_totals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ws_xp_totals` (
  `type` smallint(6) NOT NULL,
  `occurances` bigint(20) NOT NULL,
  PRIMARY KEY (`type`),
  UNIQUE KEY `type_UNIQUE` (`type`),
  KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2015-09-09 21:12:42
