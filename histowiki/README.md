# Roadmap

1. Postgis database
2. Front End MVP
3. Clean up so it can all install from checkout
4. Tyler Review frontend?



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


## Front End MVP

* Map with admin0 overlay. Showing dynamic chloropleth
* Paging table of search results when I click on one
* Timeseries chart showing counts over time when I click on one
* https://www.npmjs.com/package/pg
* jaesite

* I'm going to want to clean up the directories around here.

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

### Learning React

* Refs: https://blog.logrocket.com/how-to-use-react-createref-ea014ad09dba/
