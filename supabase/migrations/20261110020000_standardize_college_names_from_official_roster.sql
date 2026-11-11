-- Migration: 20261110020000_standardize_college_names_from_official_roster.sql
-- Description: Standardize college names and short names to match official roster document.

UPDATE colleges SET short_name = 'KKHM, Valanchery', name = 'KKHM ISLAMIC & ARTS COLLEGE' WHERE affl_no = 1;
UPDATE colleges SET short_name = 'Rasheediyya, Edavannappara', name = 'RASHEEDIYYA ISLAMIC & ARTS COLLEGE' WHERE affl_no = 2;
UPDATE colleges SET short_name = 'Majma, Kavanoor', name = 'MAJMA''A SHAREE-ATH & ARTS COLLEGE' WHERE affl_no = 4;
UPDATE colleges SET short_name = 'PMSA, Kattilangadi', name = 'PMSA POOKOYA THANGAL ISLAMIC & ARTS COLLEGE' WHERE affl_no = 11;
UPDATE colleges SET short_name = 'Darul Uloom, Thootha', name = 'DARUL ULOOM ISLAMIC & ARTS COLLEGE' WHERE affl_no = 17;
UPDATE colleges SET short_name = 'Bafakhy Wafy, Valavannur', name = 'BAFAKHY ISLAMIC & ARTS COLLEGE' WHERE affl_no = 21;
UPDATE colleges SET short_name = 'Asshuhada, Mamba', name = 'ASSHUHADA ISLAMIC DA''WA COLLEGE' WHERE affl_no = 32;
UPDATE colleges SET short_name = 'Darussalam, Tirur', name = 'DARUSSALAM ISLAMIC & ARTS COLLEGE' WHERE affl_no = 33;
UPDATE colleges SET short_name = 'MTM, Chokli', name = 'MTM ISLAMIC & ARTS COLLEGE' WHERE affl_no = 35;
UPDATE colleges SET short_name = 'MIC, Athanikkal', name = 'MAQDOOMIYYA COLLEGE FOR ISLAMIC STUDIES (MIC)' WHERE affl_no = 47;
UPDATE colleges SET short_name = 'Darul Ihsan, Changaramkulam', name = 'DARUL IHSAN ISLAMIC ACADEMY' WHERE affl_no = 51;
UPDATE colleges SET short_name = 'Kokkachal Wafy College', name = 'UMERALI SHIHAB THANGAL ISLAMIC ACADEMY' WHERE affl_no = 54;
UPDATE colleges SET short_name = 'Majlis, Puramannur', name = 'MAJLIS UMARIYYA ISLAMIC & ARTS COLLEGE' WHERE affl_no = 76;
UPDATE colleges SET short_name = 'Shihab Thangal, Munduparamba', name = 'SHIHAB THANGAL ISLAMIC & ARTS COLLEGE' WHERE affl_no = 85;
UPDATE colleges SET short_name = 'Madarijussunna, Kalanthode', name = 'MADARIJUSSUNNA ISLAMIC COLLEGE' WHERE affl_no = 101;
UPDATE colleges SET short_name = 'Swahaba, Ettikkullam', name = 'SWAHABA ISLAMIC ACADEMY' WHERE affl_no = 117;
UPDATE colleges SET short_name = 'Rahmaniyya, Irikkur', name = 'RAHMANIYYA ISLAMIC & ARTS COLLEGE' WHERE affl_no = 123;
UPDATE colleges SET short_name = 'Pang Wafy College', name = 'PANGIL AHMED KUTTY MUSLIYAR WAFY COLLEGE' WHERE affl_no = 126;
UPDATE colleges SET short_name = 'Hujjathul Islam, Kakkaramukku', name = 'HUJJATHUL ISLAM WAFY COLLEGE' WHERE affl_no = 127;
UPDATE colleges SET short_name = 'Darul Athfal Wafy Arts, Koppam', name = 'DARUL ATHFAL WAFY ARTS COLLEGE' WHERE affl_no = 129;
UPDATE colleges SET short_name = 'Perumundachery Wafy College', name = 'VARAKKAL MULLAKOYA THANGAL WAFY COLLEGE' WHERE affl_no = 131;
UPDATE colleges SET short_name = 'Riyalussaliheen Koduvally', name = 'SHAMSUL ULAMA MEMORIAL RIYALUSSALIHEEN' WHERE affl_no = 134;
UPDATE colleges SET short_name = 'Muneerul Islam, Kunduman', name = 'MUNEERUL ISLAM ARABIC (WAFY) COLLEGE, KOLLAM' WHERE affl_no = 138;

