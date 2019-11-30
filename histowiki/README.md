# Install Instructions

## Pre-requisites

* PostgreSQL & PostGIS Installed : `brew install postgis`
  or see installation notes: https://postgis.net/install/
* Conda : We use this for the python environment.
	* You'll need Jupyter

## Database Preparation

Create Database:

```
CREATE DATABASE geobrowser
```

Upload Shapefile data:
```
shp2pgsql -s 4326 data/ne_110m_admin_0_countries/ne_110m_admin_0_countries.shp public.countries_110m | psql -d geobrowser -U postgres
```

* _(SRID = 4326) See [Understanding how to get appropriate SRID from admin0 files (.prj)](https://stackoverflow.com/questions/1541202/how-do-you-know-what-srid-to-use-for-a-shp-file) for more details_

Create User:
```
CREATE USER geo WITH PASSWORD 'geo123'
GRANT CONNECT ON DATABASE geobrowser TO geo;
GRANT SELECT ON countries_110m TO geo;
```

Create People Table:
```
CREATE TABLE public.people
(
    autoid integer NOT NULL DEFAULT nextval('people_autoid_seq'::regclass),
    qid character varying(15) COLLATE pg_catalog."default",
    birth timestamp with time zone,
    birthcoords geography(Point,4326),
    birthlabel text COLLATE pg_catalog."default",
    birthqid character varying(15) COLLATE pg_catalog."default",
    death timestamp with time zone,
    deathcoords geography(Point,4326),
    deathlabel text COLLATE pg_catalog."default",
    deathqid character varying(15) COLLATE pg_catalog."default",
    image text COLLATE pg_catalog."default",
    wikidataurl text COLLATE pg_catalog."default",
    persondescription text COLLATE pg_catalog."default",
    CONSTRAINT people_pkey PRIMARY KEY (autoid)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.people
    OWNER to postgres;
```

## People data from wikidata
```
select ?person ?name ?desc ?birthDate ?birthPrecision ?birthPlace ?birthPlaceName ?birthCoords ?deathDate ?deathPrecision ?deathPlace ?deathPlaceName
where {
 ?person wdt:P31 wd:Q5;
         wdt:P569 ?birthDate.
  hint:Prior hint:rangeSafe "true"^^xsd:boolean.
  FILTER((?birthDate >= "1901-01-01"^^xsd:dateTime) && (?birthDate < "1902-01-01"^^xsd:dateTime))  
 OPTIONAL {
   ?person p:P569/psv:P569 $birthTime.
   ?birthTime wikibase:timePrecision $birthPrecision              
 }
 OPTIONAL {
    ?person rdfs:label ?name
    FILTER (LANG(?name) = "en").   
 }
 OPTIONAL {
    ?person schema:description ?desc
    FILTER (LANG(?desc) = "en").
 }
 OPTIONAL {
    ?person wdt:P19  ?birthPlace.
    ?birthPlace wdt:P625 ?birthCoords.
    ?birthPlace rdfs:label ?birthPlaceName
    FILTER (LANG(?birthPlaceName) = "en").
 }
 OPTIONAL {
    ?person wdt:P570 ?deathDate;
            wdt:P20  ?deathPlace.
    ?deathPlace wdt:P625 ?deathCoords.
    ?deathPlace rdfs:label ?deathPlaceName
    FILTER (LANG(?deathPlaceName) = "en").
    ?person p:P570/psv:P570 $deathTime.
    ?deathTime wikibase:timePrecision $deathPrecision
 }

}
```

* Codes for precision are: The codes for precision are 0: billion years, 1: hundred million years, 3: million years, 4: hundred thousand years, 5: ten thousand years, 6: millennium, 7: century, 8: decade, 9: year, 10: month, 11: day, 12: hour, 13: minute, 14: second. https://en.wikibooks.org/wiki/SPARQL/WIKIDATA_Precision,_Units_and_Coordinates

----

# Roadmap

1. Postgis database
2. Front End MVP
3. Install set of people into PostGIS
4. Clean up so it can all install from checkout
5. Tyler Review frontend?



## PostGIS Database

* Containing - admin0, admin1 geometries
* Containing people indexed by their Q ID's
	* Birth Coordinates
	* Birth Date
	* Death Coordinates
	* Death Date

Outcome: I can query for people contained in an administrative region & given time

### Uploading a shapefile into PostGIS

* Understanding how to get appropriate SRID from admin0 files (.prj) https://stackoverflow.com/questions/1541202/how-do-you-know-what-srid-to-use-for-a-shp-file
* SRID = 4326
* Adding Shapefile: https://gis.stackexchange.com/questions/41799/adding-shapefiles-to-postgis-database
* shp2pgsql -s 4326 data/ne_50m_admin_0_countries.shp public.admin0 | psql -d geobrowser -U postgres

### Outputting GeoJSON

https://gis.stackexchange.com/questions/112057/sql-query-to-have-a-complete-geojson-feature-from-postgis
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [125.6, 10.1]
  },
  "properties": {
    "name": "Dinagat Islands"
  }
}

SELECT json_build_object(
    'type',       'Feature',
    'id',         gid,
    'geometry',   ST_AsGeoJSON(geom)::json,
    'properties', json_build_object(
        'name', name,
        'population', pop_est
     )
 )
 FROM admin0
 LIMIT 1;

### People into Postgis




## Front End MVP

* Map with admin0 overlay. Showing dynamic chloropleth
* Paging table of search results when I click on one
* Timeseries chart showing counts over time when I click on one
* https://www.npmjs.com/package/pg
* jaesite

* I'm going to want to clean up the directories around here.

Detailed Steps

1. Launcher for servers (web + postgres front end)
1. Front end able to talk to web server & query
1.

### Leaflet chloropleth

* https://leafletjs.com/examples/choropleth/
* Mapbox. Public token: pk.eyJ1IjoiamFldHkiLCJhIjoiY2p5Y3hpaDNtMGF6MTNwanprY2lmZGtoaSJ9.vv8A-gUvtzjeAkU8oNGHQw
* Tried for 1/2 hour and failed to get import of json directly working in create-react-app. Should have mapboxAccessToken
	import admin0data from 'admin0data.json'.

### postgres direct connection

* https://node-postgres.com/



# Notes

SELECT * FROm admin0
limit 1;

-- SELECT json_build_object(
-- 	'type', 'FeatureCollection',
-- 	'features', json_agg(
-- 		json_build_object(
-- 			'type',       'Feature',
-- 			'id',         gid,
-- 			'geometry',   ST_AsGeoJSON(geom)::json,
-- 			'properties', json_build_object(
-- 				'name', name,
-- 				'code', iso_a3,
-- 				'population', pop_est,
-- 				'continent', continent
-- 			 )
-- 		 )
-- 	)
-- )
-- FROM admin0
-- LIMIT 1;

SELECT json_build_object(
    'type',       'Feature',
    'id',         gid,
    'geometry',   ST_AsGeoJSON(geom)::json,
    'properties', json_build_object(
        'name', name,
		'code', iso_a3,
        'population', pop_est,
		'continent', continent
     )
 )
 FROM admin0
 WHERE continent = 'Africa';

https://tableplus.io/blog/2018/04/postgresql-how-to-create-read-only-user.html
create user geo with password 'geo123'
GRANT CONNECT ON DATABASE geobrowser TO geo;
GRANT SELECT ON admin0 TO geo;

### PostGIS & Python

* http://chrishaganreporting.com/2014/03/inserting-geometry-with-postgis-and-psycopg2/
* http://www.fabianowski.eu/projects/ppygis/

### Learning React

* Refs: https://blog.logrocket.com/how-to-use-react-createref-ea014ad09dba/
