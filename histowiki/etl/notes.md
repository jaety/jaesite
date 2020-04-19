Find appropriate people

```
select distinct ?person
where {
  {
    select ?person where {
      ?person wdt:P31 wd:Q5;
           wdt:P569 ?birthDate.
      hint:Prior hint:rangeSafe "true"^^xsd:boolean.
      FILTER((?birthDate >= "-500-01-01"^^xsd:dateTime) && (?birthDate <  "1000-01-01"^^xsd:dateTime))
    }
  }
 UNION
  {
    select ?person where {
      ?person wdt:P31 wd:Q5;
           wdt:P570 ?deathDate.
      hint:Prior hint:rangeSafe "true"^^xsd:boolean.
      FILTER((?deathDate >= "-500-01-01"^^xsd:dateTime) && (?deathDate <  "1000-01-01"^^xsd:dateTime))
    }
  }   
}
```

```
select ?person
where {

}
```

Select from list of people
```
select ?person {
  VALUES ?person {
    wd:Q42
    wd:Q1048
  }
}
```

```

select ?person ?name ?desc ?article {
  VALUES ?person {
    wd:Q42
    wd:Q1048
  }
    OPTIONAL {
        ?person rdfs:label ?name.
        FILTER (LANG(?name) = "en").
    }

    OPTIONAL {
       ?person schema:description ?desc
       FILTER (LANG(?desc) = "en").
    }

    OPTIONAL {
       ?article schema:about ?person ;
          schema:inLanguage ?wikilang ;
          schema:isPartOf [ wikibase:wikiGroup "wikipedia" ] .
      FILTER(?wikilang in ('en'))
    }
}
```
