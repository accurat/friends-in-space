#Friends In Space

Friends in Space is the first social network that extends beyond Earth;
a 6 months-long open window to make new friends from all over the world and join astronaut Samantha Cristoforetti
in her expedition to the International Space Station.

##Installation

This project is build using MeteorJS 1.0. To install meteor please see [www.meteor.com](http://www.meteor.com)
It requires the following of environment variables to configure the social network authentication and to specify the role of his installation.


    NODE_ROLE=master
    FIS_TWT_KEY=Twitter Consumer key
    FIS_TWT_SECRET=Twitter Consumer Secret
    FIS_TWT_ACCESS_TOKEN=Twitter access token
    FIS_TWT_ACCESS_TOKEN_SECRET=Twitter access token secret
    FIS_FB_KEY=Facebook Consumer Key
    FIS_FB_SECRET=Facebook Consumer Secret
    FIS_GPLUS_KEY=Google Plus Consumer Key
    FIS_GPLUS_SECRET=Google Plus Consumer Secret

The ``NODE_ROLE`` env variable needs to be set always to ``master`` if you want to run a single instance of the application.
If you are willing to build the a distributed version of the application with multiple nodes, you need to have a single node
with a ``master`` role, and all the other nodes needs to be be in a ``slave`` role.
This because is the node ``master`` the only node that keep updated the orbital information (TLEs request, orbit calculation, current ISS position).
With a distributed environment, each instance of meteor needs to be configured to use the same MongoDB instance.

The Twitter Access Token and Twitter Access Token Secret are required to request and keep updated the Sam's Twitter Feed.

##Run


The current version is implemented to start from a clean state of Orbits. This means that every time you start the application
the ``FIS.Orbits`` object request to clean all the orbits from the database, and recreate all the orbits until now.
This process ensures that the calculation of each orbit begin and end is always correct and aligned with all the other orbits.

The process build the orbits starting at 2014-11-24 03:00 UTC. You can change this parameter and use any other day by changing the variable
``ISS_DAY_ZERO`` inside packages/fis-iss/orbits.js

The application request every 10 minutes if a new TLE exists. If exists it download the new TLE and use this new one to calculate the next orbits.
We've configured a safeguard TLE calculated at 2014-11-23T14:54:39.000Z, so if you don't have any TLE on your database, the orbit calculation will use this TLE.



Run the application like any other Meteor application, just run the following command on the root dir of the application:

    meteor


##Credits
This project was ideated, designed and produced by [Accurat](http://www.accurat.it)
Giorgia Lupi, Simone Quadri, Gabriele Rossi, Alex Piacentini, [Marco Vettorello](https://github.com/markov02) , Francesco Merlo



In collaboration with Samantha Cristoforetti.

With the precious help of Paolo Amoroso, Brigitte Bailleul, Eico Neumann, Remco Timmermans.

Thanks to Anne Cpamoa, Nick Howes, Riccardo Rossi, Michael Sacchi, Marco Zambianchi, Lionel Ferra, Olivia Haider, Jane MacArthur, Simone Corbellini.<br/>

Developed thanks to: [Meteor.js](https://www.meteor.com) [OpenLayer3](http://openlayers.org/) [Satellite.js](https://github.com/shashwatak/satellite-js)


##License

MIT