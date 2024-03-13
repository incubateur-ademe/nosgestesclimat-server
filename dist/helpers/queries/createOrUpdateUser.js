"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrUpdateUser = void 0;
const UserSchema_1 = require("../../schemas/UserSchema");
async function createOrUpdateUser({ userId, email, name }) {
    let userDocument;
    // If there is no userId we can't create a user
    if (!userId) {
        return;
    }
    try {
        // Check if user already exists (based on userId)
        userDocument = await UserSchema_1.User.findOne({ userId });
    }
    catch (error) {
        // Do nothing
    }
    // If not, we create a new one
    if (!userDocument) {
        const newUser = new UserSchema_1.User({
            name,
            email,
            userId,
        });
        userDocument = await newUser.save();
    }
    //If it exists, we update it with the new name and email
    if (email && userDocument.email !== email) {
        userDocument.email = email;
    }
    if (name && userDocument.name !== name) {
        userDocument.name = name;
    }
    await userDocument.save();
    return userDocument;
}
exports.createOrUpdateUser = createOrUpdateUser;
