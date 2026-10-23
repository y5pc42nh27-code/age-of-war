// Shared, bounded pose values: presentation only, never affects combat.
export function animationPose(unit,time){
  const moving=unit.state==='march',phase=time*8+(unit.phase||0);
  const progress=Math.max(0,Math.min(1,1-(unit.attack||0)/0.24));
  return {stride:moving?Math.sin(phase)*6:0,
    leftLift:moving?Math.max(0,Math.cos(phase))*3.5:0,
    rightLift:moving?Math.max(0,-Math.cos(phase))*3.5:0,
    bob:moving?(1-Math.cos(phase*2))*.65:Math.sin(time*2+(unit.phase||0))*.35,
    swing:unit.attack>0?Math.sin(progress*Math.PI):0,
    recoil:Math.max(0,Math.min(1,(unit.hit||0)/.18))*2};
}
