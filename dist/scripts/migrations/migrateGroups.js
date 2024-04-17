"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../../config");
const createOrUpdateUser_1 = require("../../helpers/queries/createOrUpdateUser");
const GroupSchema_1 = require("../../schemas/GroupSchema");
const SimulationSchema_1 = require("../../schemas/SimulationSchema");
async function migrate() {
    console.log('In migrate function...');
    // 1 - Get all the groups that don't have an administrator
    try {
        console.log('Fetching groups...');
        mongoose_1.default.connect(config_1.config.mongo.url);
        const groups = await GroupSchema_1.Group.find({ administrator: { $exists: false } });
        console.log('Groups length', groups.length);
        for (const group of groups) {
            const owner = group.owner;
            const members = group.members ?? [];
            if (!owner || !(members.length > 0)) {
                console.log('Group has no owner or members');
                continue;
            }
            const ownerUser = await (0, createOrUpdateUser_1.createOrUpdateUser)({
                email: owner?.email,
                userId: owner?.userId ?? '',
                name: owner?.name,
            });
            // 2 - For each group, create or get the User document for the owner
            // and create a reference to it in the group in the administrator field
            group.administrator = {
                name: ownerUser?.name ?? '',
                userId: ownerUser?.userId ?? '',
                email: ownerUser?.email,
            };
            for (const member of members) {
                const memberUserDocument = await (0, createOrUpdateUser_1.createOrUpdateUser)({
                    email: member.email,
                    userId: member.userId,
                    name: owner?.name,
                });
                const simulationCreated = new SimulationSchema_1.Simulation({
                    user: memberUserDocument?._id,
                    id: member?.simulation?.id,
                    actionChoices: member?.simulation?.actionChoices,
                    date: member?.simulation?.date ?? new Date(),
                    foldedSteps: member?.simulation?.foldedSteps,
                    situation: member?.simulation?.situation,
                    progression: 1,
                    group: group._id,
                });
                const simulationSaved = await simulationCreated.save();
                // 3 - Then, for each member, create or get the User document for the member
                // whether it has an email provided or not and create a reference to it in a new Simulation document
                // which can then be referenced in the group in the participants field along with the name of the member
                group.participants.push({
                    name: member.name,
                    email: memberUserDocument?.email,
                    userId: memberUserDocument?.userId ?? '',
                    simulation: simulationSaved._id,
                });
            }
            group.owner = undefined;
            group.members = undefined;
            const groupSaved = await group.save();
            console.log('Migrated group with name', groupSaved.name);
            console.log(groupSaved.administrator, groupSaved.participants);
        }
        console.log('Groups migrated');
    }
    catch (e) {
        console.error('Error', e);
    }
}
console.log('Running migration...');
//@ts-ignore
migrate();
