CREATE DATABASE  IF NOT EXISTS `ps2alerts_data` /*!40100 DEFAULT CHARACTER SET latin1 */;
USE `ps2alerts_data`;
-- MySQL dump 10.13  Distrib 5.6.24, for osx10.8 (x86_64)
--
-- Host: 85.159.214.60    Database: ps2alerts_data
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
-- Table structure for table `APILogs`
--

DROP TABLE IF EXISTS `APILogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `APILogs` (
  `key` varchar(45) NOT NULL,
  `requestsSuccess` int(11) DEFAULT NULL,
  `requestsFailed` int(11) DEFAULT NULL,
  `lastRequest` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `key_UNIQUE` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `APIUsers`
--

DROP TABLE IF EXISTS `APIUsers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `APIUsers` (
  `dataID` tinyint(4) NOT NULL AUTO_INCREMENT,
  `user` varchar(32) NOT NULL,
  `apikey` varchar(50) NOT NULL,
  `site` tinyint(1) DEFAULT NULL,
  `admin` tinyint(1) NOT NULL DEFAULT '0',
  `ps2alerts` tinyint(1) DEFAULT '0',
  `psb` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`dataID`),
  UNIQUE KEY `dataID_UNIQUE` (`dataID`),
  UNIQUE KEY `apikey_UNIQUE` (`apikey`),
  UNIQUE KEY `user_UNIQUE` (`user`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cache_hits`
--

DROP TABLE IF EXISTS `cache_hits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_hits` (
  `dataID` tinyint(4) NOT NULL,
  `dataType` varchar(45) NOT NULL,
  `cacheHits` bigint(20) DEFAULT NULL,
  `cacheMisses` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`dataID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `facility_data`
--

DROP TABLE IF EXISTS `facility_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `facility_data` (
  `facilityID` int(11) NOT NULL,
  `facilityName` varchar(100) DEFAULT NULL,
  `facilityType` varchar(100) DEFAULT NULL,
  `zone` tinyint(4) DEFAULT NULL,
  `facilityMapID` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`facilityID`),
  UNIQUE KEY `facilityID_UNIQUE` (`facilityID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `outfit_cache`
--

DROP TABLE IF EXISTS `outfit_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `outfit_cache` (
  `outfitID` varchar(20) NOT NULL,
  `outfitName` varchar(65) NOT NULL,
  `outfitTag` tinytext,
  `outfitFaction` tinyint(1) NOT NULL,
  `outfitWorld` smallint(2) NOT NULL,
  `expires` int(12) DEFAULT NULL,
  PRIMARY KEY (`outfitID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `player_cache`
--

DROP TABLE IF EXISTS `player_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_cache` (
  `playerID` varchar(20) NOT NULL,
  `playerName` varchar(25) NOT NULL,
  `playerFaction` tinyint(1) NOT NULL,
  `expires` int(12) DEFAULT NULL,
  PRIMARY KEY (`playerID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicle_data`
--

DROP TABLE IF EXISTS `vehicle_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehicle_data` (
  `vehicleID` int(11) NOT NULL,
  `vehicleName` varchar(45) DEFAULT NULL,
  `vehicleType` varchar(45) DEFAULT NULL,
  `vehicleFaction` int(1) NOT NULL,
  PRIMARY KEY (`vehicleID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weapon_data`
--

DROP TABLE IF EXISTS `weapon_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `weapon_data` (
  `weaponID` int(11) NOT NULL,
  `weaponName` varchar(100) DEFAULT NULL,
  `weaponFaction` int(1) DEFAULT NULL,
  `weaponImageLink` varchar(250) DEFAULT NULL,
  `weaponIsVehicle` int(1) DEFAULT NULL,
  `weaponCategory` int(20) DEFAULT NULL,
  PRIMARY KEY (`weaponID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `xp_data`
--

DROP TABLE IF EXISTS `xp_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `xp_data` (
  `id` int(11) NOT NULL,
  `description` varchar(200) DEFAULT NULL,
  `xp` mediumint(9) DEFAULT NULL,
  PRIMARY KEY (`id`)
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

-- Dump completed on 2015-09-09 21:11:10
