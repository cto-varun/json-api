const jsonServer = require('json-server');
const server = jsonServer.create();
const path = require('path');
const staticFile = require('connect-static-file');
// const middlewares = jsonServer.defaults({
// static: path.join(__dirname, '../build'),
// });
const fakeData = require('@ivoyant/fake-data');
const cors = require('cors');
const viewer = require('../docs/viewer.json');

const datasources = require('../config/datasources.json');

const userGroups = {
    CASEREVIEW: 'caseReview',
    COSOPS: 'caseManagement',
    CAREEBB: 'caseManagement',
    CALLCTR1: 'restricted1',
    CALLCTR2: 'groupB',
    CALLCTRMGR: 'caseManagement',
    CALLCTROPS: 'caseManagement',
    CALLCTRIMM: 'groupB',
    CATS: 'careHqProfiles',
    INSURANCE: 'caseManagement',
    CAREHQ1: 'caseManagement',
    CAREHQ2: 'caseManagement',
    CARETST: 'groupA',
    CAREKOU: 'caseManagement',
    CAREHWC: 'caseManagement',
    CAREHQCST: 'careHqProfiles',
    EBBTIER2: 'caseManagement',
    ALL: 'caseManagement',
};

const userGroupJsons = {
    groupA: require('../config/userGroups/groupA/viewer.json'),
    groupB: require('../config/userGroups/groupB/viewer.json'),
    restricted1: require('../config/userGroups/restricted1/viewer.json'),
    caseManagement: require('../config/userGroups/caseManagement/viewer.json'),
    caseReview: require('../config/userGroups/caseReview/viewer.json'),
    careHqProfiles: require('../config/userGroups/careHqProfiles/viewer.json'),
};

const mapUserGroup = (profile) => {
    let userGroup = 'groupB'; // default is groupB. Change this if needed
    if (userGroups.hasOwnProperty(profile)) {
        userGroup = userGroups[profile];
    }
    return userGroup;
};

// Throttling :-)
// server.use(function(req,res,next){
//   setTimeout(next,1500)
// });

// server.use(middlewares);
server.use(cors());
server.use(jsonServer.bodyParser);

server.use(
    jsonServer.rewriter({
        '/traces/data/:traceID': '/traces/data?traceID=:traceID',
    })
);

server.use('/json/viewer', (req, res) => res.json(viewer));

server.post('/api/login', function (req, res) {
    if (req.body.username !== 'admin') {
        // res.send(404, {
        //     message: 'Invalid username or password',
        // });
        res.status(404).send({
            message: 'Invalid username or password',
        });

        return;
    }

    res.json({ username: 'admin' });
});

let routerTraces = jsonServer.router(
    path.join(__dirname, '../sample-traces.json')
);

routerTraces.render = (req, res) => {
    if (req.query.traceID) {
        res.send(res.locals.data[0]);
    } else {
        res.send(res.locals.data);
    }
};

server.use('/random-data', (req, res) => res.json(fakeData(req.query)));
if (process.env.REACT_APP_BUILDER) {
    // // Make read only - will send back 403s for Put / Patch / Delete
    server.use(
        jsonServer.defaults({
            readOnly: true,
        })
    );

    // Needs this to work with the new api by The Senate Team
    // Add this before server.use(router)
    server.use(
        jsonServer.rewriter({
            '/api/profile/*': '/api/profile',
            '/api/dashboards/*': '/api/dashboards',
        })
    );
    server.use(
        '/api',
        jsonServer.router(path.join(__dirname, '../docs/sample-db.json'))
    );
    server.use(
        '/services',
        staticFile(path.join(__dirname, '../docs/sample-services.json'))
    );
    server.use('/traces', routerTraces);
}

// Viewer mode
if (process.env.REACT_APP_VIEWER) {
    // Make read only - will send back 403s for Put / Patch / Delete
    server.use(
        jsonServer.defaults({
            readOnly: true,
        })
    );
    let userGroup = 'groupB'; // default is groupB. Change this if needed

    server.use('/api/profile/:profile', (req, res) => {
        userGroup = mapUserGroup(req.params.profile);
        res.status(200).send(userGroupJsons[userGroup].profile);
    });
    server.use('/api/dashboards/:profile', (req, res) => {
        userGroup = mapUserGroup(req.params.profile);
        res.status(200).send(userGroupJsons[userGroup].dashboards);
    });
    server.use('/api/datasources', (req, res) => {
        res.status(200).send(datasources);
    });
}

module.exports = server;
