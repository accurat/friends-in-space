Fake = {

    generateFakeData: function () {
        var chance = new Chance();

        var currentUser = {
            _id: "fwJhzxrLeDyye3uha",
            createdAt: new Date("2014-11-14T15:21:58.783Z"),
            profile: {
                name: "Marco Vettorello",
                orbits:[],
                onOrbit: [],
                inSpace: [],
                profileImage: "http://pbs.twimg.com/profile_images/422480780397256704/2A7o7zZe_bigger.png",
                profileLink: "https://twitter.com/markov02",
                service: "twitter",
                twitterScreenName: "markov02"
            },
            services: {
                resume: {"loginTokens": [{"when": new Date("2014-11-14T15:21:58.790Z"), "hashedToken": "mZutSdwRkMV78W57zBTXqLx0nip2kN1TG88UOApLkBY="}]},
                twitter: {
                    id: "282243775",
                    screenName: "markov02",
                    accessToken: "282243775-KG6kTkZFSXdC7DWahutS4WrsXgWpBhzV4ZU5F4vg",
                    accessTokenSecret: "rtHp1mDXqT2l5xB2wfzqSheZAIQ4xVxQdXvVZawq1R9vU",
                    profile_image_url: "http://pbs.twimg.com/profile_images/422480780397256704/2A7o7zZe_normal.png",
                    profile_image_url_https: "https://pbs.twimg.com/profile_images/422480780397256704/2A7o7zZe_normal.png",
                    lang: "it"
                }
            }
        };

        var images = [
            "http://photos-c.ak.instagram.com/hphotos-ak-xfp1/10693265_291437534395658_440169162_n.jpg",
            "http://photos-f.ak.instagram.com/hphotos-ak-xfp1/891279_600082270041125_2006367357_n.jpg",
            "http://photos-a.ak.instagram.com/hphotos-ak-xpf1/1171624_588252387917248_1942174775_n.jpg",
            "https://igcdn-photos-g-a.akamaihd.net/hphotos-ak-xpa1/10538754_866538483359742_2116502269_a.jpg"
        ];


        var users = {};
        for (var i = 0; i < 1000; i++) {


            var user = {
                _id: "FAKE-USER-" + i,
                createdAt: new Date(),
                profile: {
                    links: [],
                    name: chance.name(),
                    orbits:[],
                    onOrbit: [],
                    inSpace: [],
                    profileImage: chance.pick(images),
                    profileLink: "https://plus.google.com/103771904089255287261/posts",
                    service: chance.pick(['twitter', 'google', 'facebook'])
                }
            };
            users[user._id] = user;
        }

        users[currentUser._id] = currentUser;


        var usersIds = Object.keys(users);

        //generate orbit activities
        var orbitActivities = [];


        for (var orbitId = 0; orbitId < 400; orbitId++) {

            var orbitData = FIS.Orbits.model.findOne({orbitId: orbitId});
            if(orbitData == null){
                continue;
            }


            var max = chance.integer({min: 40, max: 200});
            var usersWithActivities = chance.pick(usersIds, max);


            var maxLinkedUsers = chance.integer({min: 20, max: usersWithActivities.length});
            var linkedUsers = chance.pick(usersWithActivities, maxLinkedUsers);

            var mid = Math.ceil(linkedUsers.length / 2);
            var starterUsers = linkedUsers.slice(0, mid);
            var receivedUsers = linkedUsers.slice(mid, linkedUsers.length);


            for (var i = 0; i < usersWithActivities.length; i++) {

                var userId = usersWithActivities[i];
                var onOrbit = chance.bool();
                var coords, samGreetingsActivity, samGreetingsDist;
                if (onOrbit) {
                    var pointIndex = chance.integer({min: 0, max: orbitData.orbit.coordinates.length - 1});
                    var orbitCoords = orbitData.orbit.coordinates[pointIndex];
                    var randomLon = chance.floating({min: -15, max: 15});
                    var randomLat = chance.floating({min: -15, max: 15});
                    coords = [orbitCoords[0] + randomLon, orbitCoords[1] + randomLat];


                    samGreetingsActivity = moment.utc(orbitData.start).add(chance.integer({min: 5, max: 110}), 'm');
                    samGreetingsDist = chance.integer({min: 0, max: 100});
                } else {
                    var pointIndex = chance.integer({min: 0, max: orbitData.orbit.coordinates.length - 1});
                    var orbitCoords = orbitData.orbit.coordinates[pointIndex];
                    var randomLon = chance.floating({min: -35, max: 35});
                    var randomLat = chance.floating({min: -35, max: 35});
                    coords = [orbitCoords[0] + randomLon, orbitCoords[1] + randomLat];
                }

                var lastActivity = moment.utc(orbitData.start).add(chance.integer({min: 5, max: 110}), 'm');

                var greetingLinks = [];

                if (starterUsers.indexOf(userId)) {

                    var linked = chance.pick(receivedUsers, receivedUsers.length);
                    for (var x = 0; x < linked.length; x++) {
                        greetingLinks.push({
                            startUserId: userId,
                            endUserId: linked[x],
                            started: true
                        });
                    }
                } else if (receivedUsers.indexOf(userId)) {
                    var linked = chance.pick(starterUsers, starterUsers.length);
                    for (var x = 0; x < linked.length; x++) {
                        greetingLinks.push({
                            startUserId: linked[x],
                            endUserId: userId,
                            started: false
                        });
                    }
                }


                var userActivity = {
                    orbitId: orbitId,
                    userId: userId,
                    coordinates: coords,
                    onOrbit: onOrbit,
                    lastActivity: lastActivity.valueOf(),
                    earthGreetingsActivity: lastActivity.valueOf(),
                    samGreetingsActivity: samGreetingsActivity ? samGreetingsActivity.valueOf() : undefined,
                    samGreetingsDist: samGreetingsDist ? samGreetingsDist : undefined,
                    greetingLinks: greetingLinks,
                    type: 'user'
                };

                orbitActivities.push(userActivity);

                users[userId].profile.orbits.push({orbitId: orbitId, start: orbitData.start});
                if (onOrbit) {
                    users[userId].profile.onOrbit.push({orbitId: orbitId, start: orbitData.start});
                } else {
                    users[userId].profile.inSpace.push({orbitId: orbitId, start: orbitData.start});
                }
            }
        }

        for (var i = 0; i < orbitActivities.length; i++) {
            OrbitActivitiesModel.insert(orbitActivities[i]);
        }

        for (var userId in users) {
            Meteor.users.insert(users[userId]);
        }

    }

};