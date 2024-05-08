"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCondition = void 0;
const formatDottedName_1 = require("../../../utils/formatDottedName");
function processCondition({ situation, rule, }) {
    if (!situation) {
        return false;
    }
    // if `moyenne` attibute is used in ui rule, we want to return the value of the dottedName. Average is computed elsewhere
    if (rule?.formule?.moyenne) {
        return situation[(0, formatDottedName_1.formatDottedName)(rule.formule.moyenne[0])] ?? 0;
    }
    // if `somme` attibute is used in ui rule, we want to return the sum of values of dottedNames
    if (rule?.formule?.somme) {
        return rule.formule.somme.reduce((acc, dottedName) => {
            let itemValue = parseFloat(situation[(0, formatDottedName_1.formatDottedName)(dottedName)]);
            return acc + (!isNaN(itemValue) ? itemValue : 0);
        }, 0);
    }
    // if `une de ces conditions` attibute is used in ui rule, we want to return true if one of the conditions is true. The condition is dealt with in checkCondition.
    if (rule?.formule?.['une de ces conditions']) {
        return rule.formule['une de ces conditions'].some((condition) => checkCondition(condition, situation));
    }
    // if `une de ces conditions` attibute is used in ui rule, we want to return true if all conditions are true. The condition is dealt with in checkCondition.
    if (rule?.formule?.['toutes ces conditions']) {
        return rule.formule['toutes ces conditions'].every((condition) => checkCondition(condition, situation));
    }
    // We want to return "false" in any other case
    return false;
}
exports.processCondition = processCondition;
function checkCondition(condition, situation) {
    // The condition well defined can be split in 3 parts: the dottedName, the operator (=, <, >) and the value. We split the condition in an array.
    let split_condition = condition.split(/(\s*[=<>]\s*)/).filter(Boolean);
    if (!split_condition) {
        return false;
    }
    if (!Object.keys(situation).includes((0, formatDottedName_1.formatDottedName)(split_condition[0]))) {
        return false;
    }
    // If the condition is only a dottedName, the check of the boolean value is implicit. We want to return true if the value of the dottedName is "oui" in the situation.
    if (split_condition.length === 1) {
        return situation[(0, formatDottedName_1.formatDottedName)(split_condition[0])] === 'oui';
    }
    // If the condition is a dottedName, an operator and a value, we want to check condition between the value in the situation and the value in the condition.
    if (split_condition.length === 3) {
        return (checkConditionWithOperator(split_condition, situation) ?? false);
    }
    return false;
}
function checkConditionWithOperator(split_condition, situation) {
    let operator = split_condition[1].replace(/\s/g, '');
    const answerType = isNaN(parseFloat(split_condition[2])) ? 'string' : 'number';
    let leftConditionValue = '';
    let rightConditionValue = '';
    if (answerType === 'string') {
        leftConditionValue = situation[(0, formatDottedName_1.formatDottedName)(split_condition[0])];
        rightConditionValue = split_condition[2];
    }
    if (answerType === 'number') {
        leftConditionValue = parseFloat(situation[(0, formatDottedName_1.formatDottedName)(split_condition[0])]);
        rightConditionValue = parseFloat(split_condition[2]);
    }
    if (operator === '=') {
        return leftConditionValue === rightConditionValue;
    }
    if (operator === '>') {
        return leftConditionValue > rightConditionValue;
    }
    if (operator === '<') {
        return leftConditionValue < rightConditionValue;
    }
}
