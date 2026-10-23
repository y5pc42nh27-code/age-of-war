export const ASSAULT = Object.freeze({cost:100,duration:8,cooldown:50,damage:1.15,speed:1.25,incoming:1.10});
export const REPAIR = Object.freeze({cost:180,fraction:0.08});
export const repairCost = side => Math.round(REPAIR.cost * 1.17 ** side.era);
