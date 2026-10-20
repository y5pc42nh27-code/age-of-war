export function path(c, points, fill, stroke) {
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
export function line(c, x, y, x2, y2, color, width = 2) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.stroke();
}
export function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, 7);
  c.fill();
}
export function soldier(c, u, time, scale = 1) {
  c.save();
  c.translate(u.x || 0, 0);
  c.scale((u.side === 1 ? -1 : 1) * scale, scale);
  const enemy = u.side === 1,
    era = u.era || 0,
    weapon = u.weapon || "club",
    moving = u.state === "march",
    attack = u.attack > 0;
  const phase = time * 8 + (u.phase || 0),
    stride = moving ? Math.sin(phase) * 6 : 1,
    bob = moving ? Math.abs(Math.cos(phase)) * 1.5 : 0;
  ellipse(c, 0, 0, 16, 4, "#10120ed0");
  c.translate(0, -bob);
  if (["tank", "apc", "ifv", "cannon", "chariot"].includes(weapon)) {
    const modern = ["tank", "apc", "ifv"].includes(weapon),
      col = enemy ? "#6d6558" : "#666e54";
    if (modern) {
      ellipse(c, 0, -5, 30, 7, "#292d28");
      for (let i = -23; i < 27; i += 9) {
        ellipse(c, i, -6, 5, 5, "#46493d");
        ellipse(c, i, -6, 2.5, 2.5, "#909080");
      }
      path(
        c,
        [
          [-30, -10],
          [-24, -23],
          [19, -25],
          [31, -12],
        ],
        col,
        "#272d26",
      );
      path(
        c,
        [
          [-15, -24],
          [-9, -36],
          [12, -36],
          [23, -25],
        ],
        enemy ? "#817465" : "#7b8165",
        "#30352b",
      );
      line(c, 9, -31, 47, -34, "#282e27", 5);
      line(c, 9, -33, 47, -36, "#92967e", 1.4);
      for (let i = -17; i < 22; i += 12)
        path(
          c,
          [
            [i, -21],
            [i + 7, -23],
            [i + 7, -14],
            [i, -12],
          ],
          "#414c3e",
        );
      line(c, -21, -24, 18, -27, "#b9b998", 1);
      line(c, -12, -34, -15, -57, "#33392f", 1);
      c.fillStyle = enemy ? "#a56755" : "#c5b17a";
      c.fillRect(-20, -21, 8, 3);
    } else if (weapon === "chariot") {
      path(
        c,
        [
          [-21, -13],
          [-17, -32],
          [2, -30],
          [11, -12],
        ],
        "#826749",
        "#392f24",
      );
      for (const x of [-17, 10]) {
        ellipse(c, x, -10, 11, 11, "#a98c59");
        ellipse(c, x, -10, 8, 8, "#302d24");
        for (let n = 0; n < 6; n++)
          line(
            c,
            x,
            -10,
            x + Math.cos(n) * 8,
            -10 + Math.sin(n) * 8,
            "#a88a54",
            1,
          );
      }
      c.save();
      c.translate(12, -8);
      path(
        c,
        [
          [0, -12],
          [7, -24],
          [22, -22],
          [27, -32],
          [36, -29],
          [31, -12],
          [18, -8],
        ],
        "#6e513b",
        "#302b24",
      );
      for (const x of [10, 24]) line(c, x, -12, x + stride, -1, "#44352b", 4);
      c.restore();
      line(c, -4, -32, -3, -48, "#b9a78a", 5);
      ellipse(c, -3, -51, 4, 5, "#ad8565");
      line(c, -2, -41, 28, -64, "#bfa26b", 2);
    } else {
      for (const x of [-16, 5]) {
        ellipse(c, x, -8, 12, 12, "#625a44");
        ellipse(c, x, -8, 8, 8, "#292d25");
        for (let n = 0; n < 7; n++)
          line(
            c,
            x,
            -8,
            x + Math.cos(n) * 9,
            -8 + Math.sin(n) * 9,
            "#a39064",
            1,
          );
      }
      line(c, -20, -15, 14, -27, "#3f4439", 11);
      line(c, -20, -17, 29, -34, "#949485", 7);
      line(c, -18, -20, 29, -37, "#c4b590", 1.5);
    }
    if (attack) {
      ellipse(c, 45, -34, 11, 5, "#e5b86e");
      ellipse(c, 45, -34, 5, 2, "#fff1c2");
    }
    c.restore();
    return;
  }
  const skin = ["#bc9070", "#84634e", "#c3a184", "#765643", "#ab7f5b"][
    u.id % 5 || 0
  ];
  const cloth = enemy
    ? era < 3
      ? "#725b4c"
      : "#676452"
    : era < 3
      ? "#6a7060"
      : "#5f6c58";
  line(c, -4, -18, -5 - stride, -6, "#292c27", 6);
  line(c, 5, -18, 6 + stride, -6, "#3a3c31", 6);
  line(c, -5 - stride, -6, -2 - stride, -1, "#282925", 5);
  line(c, 6 + stride, -6, 11 + stride, -1, "#252822", 5);
  path(
    c,
    [
      [-9, -39],
      [5, -40],
      [10, -19],
      [-9, -17],
    ],
    cloth,
    "#33382d",
  );
  path(
    c,
    [
      [-6, -38],
      [0, -37],
      [1, -21],
      [-7, -21],
    ],
    "#a8a38a40",
  );
  if (era === 0) {
    path(
      c,
      [
        [-9, -38],
        [-3, -40],
        [8, -21],
        [-1, -19],
      ],
      "#967853",
    );
    line(c, -8, -20, 9, -22, "#352e26", 3);
  }
  if (era === 1 || era === 2) {
    path(
      c,
      [
        [-8, -37],
        [5, -38],
        [8, -23],
        [-9, -23],
      ],
      era === 1 ? "#a28e61" : "#8c9791",
      "#333a33",
    );
    line(c, -5, -35, -5, -25, "#d4c9a1", 1);
    path(
      c,
      [
        [-9, -23],
        [8, -24],
        [11, -16],
        [-11, -16],
      ],
      cloth,
    );
  }
  if (era >= 5) {
    c.fillStyle = "#343f32";
    c.fillRect(-8, -36, 15, 14);
    for (let n = -6; n < 7; n += 5) {
      c.fillStyle = "#879078";
      c.fillRect(n, -31, 3, 6);
    }
    c.fillStyle = "#475443";
    c.fillRect(-13, -36, 5, 15);
  }
  ellipse(c, -1, -45, 5.5, 7, skin);
  path(
    c,
    [
      [-6, -48],
      [-3, -53],
      [3, -52],
      [6, -46],
    ],
    era < 2 ? "#302e27" : era < 5 ? "#a4a48f" : cloth,
  );
  if (era === 2) {
    path(
      c,
      [
        [-7, -46],
        [-5, -54],
        [4, -54],
        [6, -45],
      ],
      "#9ca49c",
      "#414c43",
    );
    line(c, 0, -50, 0, -42, "#414c43", 1.5);
  }
  if (era >= 5) {
    ellipse(c, -1, -50, 7, 4, cloth);
    line(c, -8, -49, 7, -49, "#89917c", 1);
  }
  line(c, 1, -43, 4, -43, "#282e25", 1);
  line(c, -4, -38, attack ? 10 : 7, -28, skin, 5);
  const ax = attack ? 16 : 11,
    ay = attack ? -31 : -29;
  line(c, 7, -29, ax, ay, skin, 4);
  if (["club", "sword", "shovel"].includes(weapon)) {
    const wx = attack ? 30 : 17,
      wy = attack ? -33 : -52;
    line(c, ax, ay, wx, wy, "#795e3c", 3);
    if (weapon === "club") ellipse(c, wx, wy, 4, 9, "#807d6d");
    else if (weapon === "sword") line(c, ax, ay, wx, wy, "#c2c5b6", 3);
    else
      path(
        c,
        [
          [wx - 4, wy],
          [wx + 4, wy],
          [wx + 4, wy + 8],
          [wx, wy + 11],
          [wx - 4, wy + 8],
        ],
        "#858b79",
      );
  } else if (["spear", "pike"].includes(weapon)) {
    line(c, -12, -14, attack ? 48 : 24, attack ? -35 : -64, "#9a8057", 2);
    const x = attack ? 48 : 24,
      y = attack ? -35 : -64;
    path(
      c,
      [
        [x - 3, y + 5],
        [x + 3, y + 3],
        [x + 3, y - 7],
      ],
      "#c1beaa",
    );
  } else if (weapon === "bow") {
    c.strokeStyle = "#b59965";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(13, -32, 15, -1.3, 1.3);
    c.stroke();
    line(c, 17, -47, 17, -17, "#bbb5a0", 0.6);
    line(c, 6, -31, 31, -31, "#c1b89b", 1);
  } else if (weapon === "crossbow") {
    line(c, 3, -30, 30, -32, "#705439", 4);
    line(c, 22, -42, 24, -22, "#a3a99a", 2);
  } else {
    line(c, 2, -29, 33, -31, "#292d28", 4);
    line(c, 7, -30, 29, -32, "#858b7d", 1);
    line(c, 15, -29, 13, -24, "#353a2f", 3);
    if (weapon === "sniper") line(c, 11, -35, 24, -35, "#292d28", 3);
    if (weapon === "mg") {
      line(c, 28, -28, 32, -16, "#464b3e", 1.5);
    }
    if (weapon === "drone") {
      c.fillStyle = "#252e27";
      c.fillRect(8, -34, 10, 7);
      const dx = 21 + Math.sin(time * 3) * 6,
        dy = -73 + Math.sin(time * 4) * 3;
      line(c, dx - 10, dy, dx + 10, dy, "#303d35", 2);
      line(c, dx, dy - 5, dx, dy + 5, "#303d35", 2);
      for (const a of [-10, 10]) ellipse(c, dx + a, dy, 6, 1, "#b6b9a5");
      ellipse(c, dx, dy, 3, 3, "#424e40");
    } else if (attack) {
      path(
        c,
        [
          [33, -32],
          [45, -36],
          [40, -30],
          [47, -27],
          [33, -29],
        ],
        "#e8c484",
      );
    }
  }
  if (
    (era === 0 && u.slot === 2) ||
    (era === 1 && u.slot === 0) ||
    (era === 2 && u.slot === 2)
  ) {
    ellipse(c, -8, -29, 9, 13, enemy ? "#855c49" : "#7a7850");
    ellipse(c, -8, -29, 6, 10, "#393f3440");
    ellipse(c, -8, -29, 2, 3, "#b9aa79");
  }
  if (u.hit > 0) {
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = "#eed3a840";
    c.fillRect(-15, -55, 40, 55);
  }
  c.restore();
}
export function drawBase(c, x, ground, era, side, hp, maxHp) {
  c.save();
  c.translate(x, ground);
  if (side) c.scale(-1, 1);
  const stone = side ? "#6e6659" : "#717363",
    dark = "#292e28",
    light = "#a1a08a";
  ellipse(c, 0, 0, 80, 10, "#0d100f70");
  if (era === 0) {
    path(
      c,
      [
        [-65, 0],
        [-60, -60],
        [-43, -89],
        [-9, -102],
        [29, -85],
        [63, -44],
        [63, 0],
      ],
      stone,
      dark,
    );
    path(
      c,
      [
        [-43, -82],
        [-9, -100],
        [30, -82],
        [54, -43],
        [11, -55],
        [-24, -43],
      ],
      "#97947d",
    );
    path(
      c,
      [
        [-33, 0],
        [-32, -37],
        [-14, -55],
        [13, -51],
        [31, -31],
        [34, 0],
      ],
      "#242a25",
    );
    for (let i = 0; i < 7; i++) {
      const p = i * 18 - 58;
      line(c, p, 0, p + 3, -22 - (i % 3) * 8, "#665b43", 5);
    }
    line(c, 48, 0, 48, -123, "#63563d", 3);
    path(
      c,
      [
        [48, -121],
        [79, -113],
        [48, -102],
      ],
      side ? "#864f3b" : "#b9a16a",
    );
  } else if (era <= 3) {
    c.fillStyle = stone;
    c.fillRect(-65, -74, 130, 74);
    c.fillStyle = "#626959";
    c.fillRect(-35, -117, 70, 117);
    for (const tx of [-65, 39]) {
      c.fillStyle = stone;
      c.fillRect(tx, -101, 27, 101);
      for (let i = 0; i < 3; i++) c.fillRect(tx + i * 10, -110, 7, 12);
    }
    if (era === 1) {
      path(
        c,
        [
          [-75, -76],
          [0, -120],
          [75, -76],
        ],
        light,
        dark,
      );
      for (let i = -54; i < 60; i += 22) {
        c.fillStyle = "#979784";
        c.fillRect(i, -73, 9, 73);
      }
    }
    if (era === 2) {
      path(
        c,
        [
          [-43, -117],
          [0, -159],
          [43, -117],
        ],
        side ? "#574e43" : "#515c4f",
        dark,
      );
    }
    if (era === 3) {
      path(
        c,
        [
          [-82, 0],
          [-71, -51],
          [-45, -64],
          [45, -64],
          [77, -42],
          [89, 0],
        ],
        stone,
        dark,
      );
      line(c, 28, -51, 83, -70, "#393d33", 9);
    }
    path(
      c,
      [
        [-15, 0],
        [-15, -39],
        [-10, -51],
        [9, -52],
        [17, -39],
        [17, 0],
      ],
      dark,
    );
    for (let yy = -65; yy < -5; yy += 15)
      line(c, -64, yy, 64, yy, "#383f3240", 1);
    for (const xx of [-49, 48]) {
      c.fillStyle = dark;
      c.fillRect(xx, -86, 5, 17);
    }
    line(c, 5, -125, 5, -169, "#888a73", 2);
    path(
      c,
      [
        [5, -168],
        [35, -161],
        [29, -142],
        [5, -146],
      ],
      side ? "#86523c" : "#b4a16a",
    );
  } else {
    path(
      c,
      [
        [-80, 0],
        [-70, -45],
        [-50, -68],
        [46, -68],
        [77, -47],
        [86, 0],
      ],
      stone,
      dark,
    );
    c.fillStyle = "#969781";
    c.fillRect(-53, -78, 100, 14);
    c.fillStyle = "#343b32";
    c.fillRect(-58, -48, 117, 10);
    c.fillStyle = "#252c27";
    c.fillRect(-25, -32, 35, 32);
    line(c, 27, -50, 86, -60, "#333a31", 8);
    line(c, 27, -52, 86, -62, "#a5a48c", 1);
    for (let i = -77; i < 77; i += 17) {
      ellipse(c, i, -8, 12, 5, "#929077");
      ellipse(c, i + 4, -16, 11, 5, "#797c64");
    }
    if (era >= 6) {
      line(c, -45, -77, -45, -160, "#777e6b", 3);
      for (let yy = -155; yy < -77; yy += 20)
        line(c, -54, yy, -36, yy + 18, "#747c68", 1);
      line(c, -61, -135, -30, -135, "#858c78", 2);
    }
    if (era === 7) {
      ellipse(c, 29, -82, 18, 4, "#505f51");
      line(c, 29, -82, 34, -105, "#75846f", 3);
      c.strokeStyle = "#9ca38b";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(34, -113, 14, 0.2, 2.8);
      c.stroke();
    }
    path(
      c,
      [
        [0, -75],
        [0, -110],
        [30, -107],
        [30, -83],
      ],
      side ? "#86503b" : "#b4a16a",
    );
  }
  if (hp / maxHp < 0.5) {
    for (let n = 0; n < 3; n++) {
      ellipse(c, -25 + n * 18, -60 - n * 20, 10 + n * 5, 20, "#282b2680");
    }
  }
  c.restore();
}
export function makePortrait(era, slot, stats) {
  const canvas = document.createElement("canvas");
  canvas.width = 180;
  canvas.height = 114;
  const c = canvas.getContext("2d");
  const g = c.createLinearGradient(0, 0, 180, 114);
  g.addColorStop(0, "#373e32");
  g.addColorStop(1, "#171d19");
  c.fillStyle = g;
  c.fillRect(0, 0, 180, 114);
  for (let n = 0; n < 30; n++) {
    c.strokeStyle = "#b3b29408";
    c.beginPath();
    c.moveTo(n * 10, 0);
    c.lineTo(n * 10 - 80, 114);
    c.stroke();
  }
  c.translate(83, 109);
  soldier(c, { ...stats, x: 0, id: slot + 1, side: 0, state: "idle" }, 0, 1.7);
  return canvas.toDataURL();
}
