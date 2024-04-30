"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const answersRoute_1 = __importDefault(require("./routes/_legacy/answersRoute"));
const surveysRoute_1 = __importDefault(require("./routes/_legacy/surveysRoute"));
const statsRoute_1 = __importDefault(require("./routes/stats/statsRoute"));
const simulationRoute_1 = __importDefault(require("./routes/_legacy/simulationRoute"));
const ratingsRoute_1 = __importDefault(require("./routes/_legacy/ratingsRoute"));
const fetchSimulation_1 = __importDefault(require("./routes/saveSimulationTestEnd/fetchSimulation"));
// Groups routes
const fetchGroup_1 = __importDefault(require("./routes/groups/fetchGroup"));
const createGroup_1 = __importDefault(require("./routes/groups/createGroup"));
const updateGroup_1 = __importDefault(require("./routes/groups/updateGroup"));
const deleteGroup_1 = __importDefault(require("./routes/groups/deleteGroup"));
// Group participants routes
const fetchGroups_1 = __importDefault(require("./routes/groups/fetchGroups"));
const removeParticipant_1 = __importDefault(require("./routes/groups/removeParticipant"));
// Organisation routes
const create_1 = __importDefault(require("./routes/organisations/create"));
const fetchOrganisation_1 = __importDefault(require("./routes/organisations/fetchOrganisation"));
const login_1 = __importDefault(require("./routes/organisations/login"));
const sendVerificationCode_1 = __importDefault(require("./routes/organisations/sendVerificationCode"));
const update_1 = __importDefault(require("./routes/organisations/update"));
const validateVerificationCode_1 = __importDefault(require("./routes/organisations/validateVerificationCode"));
const fetchPoll_1 = __importDefault(require("./routes/organisations/fetchPoll"));
const fetchPolls_1 = __importDefault(require("./routes/organisations/fetchPolls"));
const fetchPollProcessedData_1 = __importDefault(require("./routes/organisations/fetchPollProcessedData"));
const logout_1 = __importDefault(require("./routes/organisations/logout"));
const verifyUserParticipation_1 = __importDefault(require("./routes/organisations/verifyUserParticipation"));
// Simulation routes
const create_2 = __importDefault(require("./routes/simulations/create"));
const fetchSimulation_2 = __importDefault(require("./routes/simulations/fetchSimulation"));
// Quiz routes
const create_3 = __importDefault(require("./routes/quiz/create"));
// Northstar routes
const create_4 = __importDefault(require("./routes/northstar/create"));
// Email route
const sendEmail_1 = __importDefault(require("./routes/email/sendEmail"));
// Settings route
const updateSettings_1 = __importDefault(require("./routes/settings/updateSettings"));
const getNewsletterSubscriptions_1 = __importDefault(require("./routes/settings/getNewsletterSubscriptions"));
const cors_1 = __importDefault(require("cors"));
const AnswerSchema_1 = __importDefault(require("./schemas/_legacy/AnswerSchema"));
const initDatabase_1 = __importDefault(require("./scripts/initDatabase"));
const config_1 = require("./config");
if (config_1.config.env === 'development') {
    require('dotenv').config();
}
const app = (0, express_1.default)();
app.use(express_1.default.json());
const origin = config_1.config.env === 'development'
    ? [
        'http://localhost:8080',
        'http://localhost:8888',
        'http://localhost:3000',
    ]
    : [
        'https://nosgestesclimat.fr',
        /\.vercel\.app$/,
        'http://localhost:3000',
        'https://sondages.nosgestesclimat.fr',
        'https://preprod.nosgestesclimat.fr',
        'https://nosgestesclimat.vercel.app',
        'https://nosgestesclimat-git-preprod-nos-gestes-climat.vercel.app',
        'https://nosgestesclimat-git-parcours-orga-dashboard-ademe.vercel.app',
        'https://parcours-orga.review.nosgestesclimat.fr',
    ];
app.use((0, cors_1.default)({
    origin,
    credentials: true,
}));
// serve static context files
app.use(express_1.default.static('contextes-sondage'));
// Legacy routes
app.use('/answers', answersRoute_1.default);
app.use('/surveys', surveysRoute_1.default);
app.use('/get-stats', statsRoute_1.default);
app.use('/simulation', simulationRoute_1.default);
app.use('/ratings', ratingsRoute_1.default);
app.use('/email-simulation/:id?', fetchSimulation_1.default);
// Simulations route
app.use('/simulations/create', create_2.default);
app.use('/simulations/fetch-simulation', fetchSimulation_2.default);
// Group routes
app.use('/group/fetch', fetchGroup_1.default);
app.use('/group/create', createGroup_1.default);
app.use('/group/update', updateGroup_1.default);
app.use('/group/delete', deleteGroup_1.default);
// Group participants routes
app.use('/group/fetch-groups', fetchGroups_1.default);
app.use('/group/remove-participant', removeParticipant_1.default);
// Organisation routes
app.use('/organisations/create', create_1.default);
app.use('/organisations/login', login_1.default);
app.use('/organisations/fetch-organisation', fetchOrganisation_1.default);
app.use('/organisations/update', update_1.default);
app.use('/organisations/validate-verification-code', validateVerificationCode_1.default);
app.use('/organisations/send-verification-code', sendVerificationCode_1.default);
app.use('/organisations/fetch-poll:pollSlug?', fetchPoll_1.default);
app.use('/organisations/fetch-poll-processed-data', fetchPollProcessedData_1.default);
app.use('/organisations/fetch-polls', fetchPolls_1.default);
app.use('/organisations/logout', logout_1.default);
app.use('/organisations/verify-user-participation', verifyUserParticipation_1.default);
// Quiz routes
app.use('/quiz/answers/create', create_3.default);
// Northstar routes
app.use('/northstar/ratings/create', create_4.default);
// Email route
app.use('/send-email', sendEmail_1.default);
// Settings route
app.use('/update-settings', updateSettings_1.default);
app.use('/get-newsletter-subscriptions', getNewsletterSubscriptions_1.default);
// require the http module
const http = require('http').Server(app);
// require the socket.io module
const socketio = require('socket.io');
const io = socketio(http, {
    cors: { origin, methods: ['GET', 'POST'] },
});
// create an event listener
//
// To listen to messages
io.on('connection', (socket) => {
    console.log('user connected to io');
    socket.on('disconnect', function () {
        console.log('user disconnected from io');
    });
    socket.on('answer', function ({ room, answer }) {
        socket.join(room);
        console.log(`update ${answer.id} user's data in survey ${room} with total ${answer.data.total}`);
        socket.to(room).emit('received', { answer });
        initDatabase_1.default.then(async () => {
            const query = { id: answer.id };
            const update = answer;
            const options = { upsert: true, new: true, setDefaultsOnInsert: true };
            // Find the document
            await AnswerSchema_1.default.findOneAndUpdate(query, update, options);
        });
    });
});
http.listen(config_1.config.app.port, () => {
    const host = http.address().address;
    const port = http.address().port;
    console.info({ config: config_1.config });
    console.log('App listening at http://%s:%s', host, port);
});
