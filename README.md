# URL Shortener Microservice

This repository implements URL Shortener Microservice for one of the FCC backend projects.

The service can be found running on [Heroku](https://url-shortener-ellacodecamp.herokuapp.com)

## Running on Heroku

To run this app on Heroku, configure MongoDB add on and the following environment variables:

* ```MONGO_URI```
* ```BASE_URL```, example: ```BASE_URL=https://url-shortener-ellacodecamp.herokuapp.com```

## Design notes

This microservice was designed to use database for short URL identifier storage. It uses collection ```shorturl```
to store URL identifier in ```_id``` field and to store original URL in ```url``` field.

To keep URL identifier short, the original url is hashed using Murmur Hash algorithm (32 bit version) and the first
2 bytes of the result are used. The identifier is represented in hex format when it is returned to the user and therefore
is only 4 characters long. If collision is detected, it is resolved by appending ```01``` to the identifier. If such identifier
exists, this number gets incremented and appended to the original identifier as a hex string of even number of characters. The
process is repeated till unused unique identifier is found for the original_url.
I did not want to over engineer it too much for such a simple app. This was a simple way to guarantee URL identifier uniqueness.

