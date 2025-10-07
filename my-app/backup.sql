-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: message
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auth_session`
--

DROP TABLE IF EXISTS `auth_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_session` (
  `id` varchar(128) NOT NULL,
  `user_id` varchar(15) NOT NULL,
  `expires_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `auth_session_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_session`
--

LOCK TABLES `auth_session` WRITE;
/*!40000 ALTER TABLE `auth_session` DISABLE KEYS */;
INSERT INTO `auth_session` VALUES ('dhuehuukopzgatdmmlmxtj63zoaim7xe5sx22ocm','tmzn48osz75rb70','2025-11-05 06:28:53'),('el7swgyppv55cgu6n2yljounbowapp5dewvlpqlu','s468oi0uuqg70nm','2025-11-05 10:49:26'),('vnaflaolhukw36ukwk5sobcaubglxpoze7cqqmph','s468oi0uuqg70nm','2025-11-05 06:23:15');
/*!40000 ALTER TABLE `auth_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_user`
--

DROP TABLE IF EXISTS `auth_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_user` (
  `id` varchar(15) NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_user`
--

LOCK TABLES `auth_user` WRITE;
/*!40000 ALTER TABLE `auth_user` DISABLE KEYS */;
INSERT INTO `auth_user` VALUES ('06llha3cvzi7rv4','aliceuser@gmail.com','aliceuser','$2b$10$jKvuQu1ElZVpBACBVLYL6ePsC9gtW6h3IbtTDfr3litm2PH4RJ5Pa','2025-10-06 04:48:02','2025-10-06 04:48:02'),('aw7lkg2lj06bn63','chef@gmail.com','chef','$2b$10$CFF5fkFtw/IkUd55DgQS8eKbvrdrWrB4hVpUvVeJlHi67wFF7skQq','2025-10-06 04:46:34','2025-10-06 04:46:34'),('fpdoptoak7t0njv','doe@gmail.com','doe','$2b$10$KqGd4xifRLZv43fsykAMluchG.40XkUoRCFwgS7EYDLBtg6QxpNXa','2025-10-06 04:46:18','2025-10-06 04:46:18'),('s468oi0uuqg70nm','johnuser@gmail.com','John','$2b$10$rgIKVXFP12CV4r8FUrNyz.0kLaH7a/oqA4Ly8ggS7MT/4OAlklnEm','2025-10-03 05:42:43','2025-10-03 05:42:43'),('sprxr2g2kr7c33c','doeuser@gmail.com','doeuser','$2b$10$D2lL2cEfg4SSCK21rjZk1eziKFbCEEpwn.3ei22M4Ilm8T/YOhkQy','2025-10-06 04:47:17','2025-10-06 04:47:17'),('t2t6bq9g29d7evl','bobuser@gmail.com','bobuser','$2b$10$K5NRKc/SGJL1Xt/lQsVvaOsThHSpnDkTshvNlyi2HrJejmC.1ne82','2025-10-06 04:48:41','2025-10-06 04:48:41'),('t2ymlmz4g2paai0','john@gmail.com','Johnuser','$2b$10$gi8sQEx4iKNSI2Y1kYdjCOAWhqDJVogWiZkTynaobRn4UpE6DWrIa','2025-10-06 04:47:46','2025-10-06 04:47:46'),('tk5i0hkexvpyl52','bob@gmail.com','bob','$2b$10$p5KmUglOlWnNpT7jlgZ4I.pMbO2iYE/QdzWBzwHA8ffWJ6kM1gX2.','2025-10-06 04:46:52','2025-10-06 04:46:52'),('tmzn48osz75rb70','alice@gmail.com','alice','$2b$10$V4eudPB4pG26ZKxN01zuZO4AFr5MB.pRzycK28YpsnWEKDmlCdLCS','2025-10-03 05:42:37','2025-10-03 05:42:37');
/*!40000 ALTER TABLE `auth_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat`
--

DROP TABLE IF EXISTS `chat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sender_id` varchar(255) NOT NULL,
  `receiver_id` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  CONSTRAINT `chat_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `auth_user` (`id`),
  CONSTRAINT `chat_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=432 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat`
--

LOCK TABLES `chat` WRITE;
/*!40000 ALTER TABLE `chat` DISABLE KEYS */;
INSERT INTO `chat` VALUES (414,'tmzn48osz75rb70','s468oi0uuqg70nm','hii','2025-10-06 10:43:37'),(415,'s468oi0uuqg70nm','tmzn48osz75rb70','hello','2025-10-06 10:43:45'),(416,'s468oi0uuqg70nm','tmzn48osz75rb70','hii','2025-10-06 10:55:26'),(417,'tmzn48osz75rb70','s468oi0uuqg70nm','hello','2025-10-06 10:59:25'),(418,'tmzn48osz75rb70','s468oi0uuqg70nm','hii','2025-10-06 11:41:30'),(419,'s468oi0uuqg70nm','tmzn48osz75rb70','hello','2025-10-06 11:41:45'),(420,'tmzn48osz75rb70','s468oi0uuqg70nm','hiii','2025-10-06 11:42:07'),(421,'tmzn48osz75rb70','s468oi0uuqg70nm','hii','2025-10-06 11:42:41'),(422,'s468oi0uuqg70nm','tmzn48osz75rb70','hello','2025-10-06 11:49:12'),(423,'s468oi0uuqg70nm','tmzn48osz75rb70','hi','2025-10-06 11:57:20'),(424,'s468oi0uuqg70nm','tmzn48osz75rb70','hello','2025-10-06 12:02:20'),(425,'s468oi0uuqg70nm','tmzn48osz75rb70','hii','2025-10-06 12:15:02'),(426,'s468oi0uuqg70nm','tmzn48osz75rb70','hello','2025-10-06 12:15:17'),(427,'s468oi0uuqg70nm','tmzn48osz75rb70','hii','2025-10-06 12:16:46'),(428,'s468oi0uuqg70nm','tmzn48osz75rb70','hiii','2025-10-06 12:16:48'),(429,'s468oi0uuqg70nm','tmzn48osz75rb70','hiii','2025-10-06 12:16:50'),(430,'s468oi0uuqg70nm','tmzn48osz75rb70','hello','2025-10-06 13:29:29'),(431,'s468oi0uuqg70nm','tmzn48osz75rb70','helo','2025-10-06 14:15:25');
/*!40000 ALTER TABLE `chat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `db`
--

DROP TABLE IF EXISTS `db`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `db` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `db`
--

LOCK TABLES `db` WRITE;
/*!40000 ALTER TABLE `db` DISABLE KEYS */;
/*!40000 ALTER TABLE `db` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-06 16:43:56
