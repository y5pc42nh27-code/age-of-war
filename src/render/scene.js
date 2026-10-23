import Phaser from "phaser";
import { FramePacer } from "./pacing.js";
import { battlefieldUrl } from "../assets.js";
import { drawBase, soldier, ellipse, line, path } from "./art.js";
import { ERAS } from "../game/data.js";
export class Battlefield extends Phaser.Scene {
  constructor(getGame, onEvents, quality) {
    super("battlefield");
    this.quality = quality;
    this.pacer = new FramePacer();
    this.focus = quality.mobile;
    this.getSimulation = getGame;
    this.onEvents = onEvents;
    this.effects = [];
    this.craters = [];
    this.effectPool = [];
    this.unitSprites = new Map();
    this.shake = 0;
  }
  preload() {
    this.load.image("landscape", battlefieldUrl);
  }
  create() {
    this.surface = this.textures.createCanvas("surface", 1600, 640);
    this.terrain = document.createElement("canvas");
    this.terrainEra = -1;
    this.appliedQuality = null;
    this.fogStamp = document.createElement("canvas");
    this.fogStamp.width = this.fogStamp.height = 128;
    const fogContext = this.fogStamp.getContext("2d");
    const fog = fogContext.createRadialGradient(64, 64, 2, 64, 64, 64);
    fog.addColorStop(0, "#d0c5a00b");
    fog.addColorStop(1, "#b4b09000");
    fogContext.fillStyle = fog;
    fogContext.fillRect(0, 0, 128, 128);
    this.brush = this.surface.context;
    this.display = this.add.image(800, 320, "surface");
    this.bg = this.textures.get("landscape").getSourceImage();
    this.input.on("pointerdown", (pointer) => {
      this.dragX = pointer.x;
      this.dragStart = this.manualCenter ?? this.cameraCenter ?? 800;
    });
    this.input.on("pointermove", (pointer) => {
      if (pointer.isDown && this.focus && Math.abs(pointer.x - this.dragX) > 6)
        this.manualCenter = Math.max(
          400,
          Math.min(
            1200,
            this.dragStart - (pointer.x - this.dragX) / this.cameras.main.zoom,
          ),
        );
    });
    this.ready = true;
  }
  effect(effect) {
    if (this.effects.length < this.quality.profile.effects) {
      const item = this.effectPool.pop() || {};
      const duration =
        effect.type === "death"
          ? 1.2
          : effect.type === "special"
            ? 1.6
            : effect.type === "impact"
              ? 0.8
              : 0.28;
      Object.assign(item, effect, { life: duration, total: duration });
      this.effects.push(item);
    }
    if (effect.type === "impact") {
      this.shake=9;if(this.craters.length>=12)this.craters.shift();this.craters.push({x:effect.x,r:32+(effect.era||0)*3});
    }
  }
  update(_, delta) {
    if (!this.ready) return;
    const elapsed = this.pacer.advance(delta, this.quality.profile.fps);
    if (!elapsed) return;
    const sim = this.getSimulation();
    this.onEvents(elapsed / 1000);
    const start = performance.now();
    const profile = this.quality.profile;
    if (this.appliedQuality !== this.quality.key) {
      this.surface.setSize(
        Math.round(1600 * profile.scale),
        Math.round(640 * profile.scale),
      );
      this.display.setDisplaySize(1600, 640);
      this.terrain.width = this.surface.width;
      this.terrain.height = this.surface.height;
      this.terrainEra = -1;
      this.unitSprites.clear();
      this.appliedQuality = this.quality.key;
      this.effects.splice(profile.effects);
      this.effectPool.splice(profile.effects);
    }
    const camera = this.cameras.main;
    const zoom = camera.width / (this.focus && sim ? 800 : 1600);
    const friends = sim?.units.filter((u) => u.side === 0) || [];
    const front = friends.length ? Math.max(...friends.map((u) => u.x)) : 230;
    this.cameraCenter =
      this.focus && sim
        ? Math.max(400, Math.min(1200, this.manualCenter ?? front + 120))
        : 800;
    camera.setZoom(zoom);
    camera.centerOn(this.cameraCenter, 505 - (camera.height / zoom) * 0.25);
    const idle = !sim || sim.paused || sim.result || document.body.dataset.screen !== 'battle';
    const idleKey=[this.quality.key,camera.width,camera.height,this.cameraCenter,sim?.time,this.focus,this.craters.length].join(':');
    if(idle && this.idleKey===idleKey)return;
    this.idleKey=idle?idleKey:null;
    this.paint(sim, Math.min(elapsed / 1000, 0.05));
    if(!idle)this.quality.sample(performance.now() - start, elapsed);
    if (!this.bootComplete) {
      this.bootComplete = true;
      window.bloodlinesBoot?.complete();
    }
  }
  paint(sim, dt) {
    const c = this.brush,
      t = sim?.time || 0,
      era = sim?.sides[0].era || 0,
      ground = 505;
    c.setTransform(
      this.quality.profile.scale,
      0,
      0,
      this.quality.profile.scale,
      0,
      0,
    );
    c.clearRect(0, 0, 1600, 640);
    c.save();
    if (this.shake > 0) {
      c.translate(
        Math.sin(t * 93) * this.shake,
        Math.cos(t * 83) * this.shake * 0.4,
      );
      this.shake = Math.max(0, this.shake - dt * 35);
    }
    if (this.terrainEra !== era) {
      const terrainContext = this.terrain.getContext("2d");
      terrainContext.setTransform(
        this.quality.profile.scale,
        0,
        0,
        this.quality.profile.scale,
        0,
        0,
      );
      terrainContext.clearRect(0, 0, 1600, 640);
      this.paintTerrain(terrainContext, era);
      this.terrainEra = era;
    }
    c.drawImage(
      this.terrain,
      0,
      0,
      this.terrain.width,
      this.terrain.height,
      0,
      0,
      1600,
      640,
    );
    for(const crater of this.craters){ellipse(c,crater.x,ground+7,crater.r,7,'#0d130f90');ellipse(c,crater.x,ground+5,crater.r*0.75,3,'#564d3970');}
    const sides = sim?.sides || [
      { hp: 6000, maxHp: 6000, era: 0 },
      { hp: 6000, maxHp: 6000, era: 0 },
    ];
    for (let id = 0; id < 2; id++) {
      const s = sides[id],
        x = id ? 1483 : 117;
      if (s.cover) {
        for (let i = 0; i < 11; i++) {
          ellipse(c, id ? 1330 + i * 9 : 180 + i * 9, 503, 8, 4, "#7f8066");
          ellipse(c, id ? 1333 + i * 9 : 183 + i * 9, 496, 8, 4, "#979578");
        }
      }
      drawBase(c, x, ground, s.era, id, s.hp, s.maxHp);
      for (let i = 0; i < (s.defenses?.length || 0); i++) {
        const d = s.defenses[i],
          tx = id ? 1380 - i * 44 : 220 + i * 44;
        path(
          c,
          [
            [tx - 13, 500],
            [tx - 8, 474],
            [tx + 8, 474],
            [tx + 14, 500],
          ],
          "#666f58",
          "#303b2e",
        );
        line(
          c,
          tx,
          474,
          tx + (id ? -23 : 23),
          d.type ? 467 : 459,
          "#92977c",
          d.type ? 4 : 7,
        );
        if (d.era === 7 && d.type === 1) {
          ellipse(c, tx, 463, 9, 4, "#7a8e74");
        }
      }
      const hx = id ? 1395 : 49,
        hy = 306;
      c.fillStyle = "#111b1690";
      c.fillRect(hx, hy, 156, 3);
      c.fillStyle = id ? "#a66b59" : "#c3b180";
      c.fillRect(hx, hy, (156 * s.hp) / s.maxHp, 3);
      c.fillStyle = "#c7ccb6";
      c.font = "10px sans-serif";
      c.textAlign = id ? "right" : "left";
      c.fillText(
        id ? "DYREKTORAT ŻELAZA" : "PRZYMIERZE ŚWITU",
        id ? 1550 : 49,
        294,
      );
    }
    if (sim) {
      const units = [...sim.units].sort((a, b) => a.depth - b.depth);
      for (const u of units) {
        c.save();
        c.translate(0, ground + u.depth);
        if (this.quality.key === "low") {
          const sprite = this.cachedUnit(u, t);
          c.drawImage(sprite, u.x - 50, -100);
          if (u.hit > 0) {
            c.globalAlpha = 0.35;
            c.fillStyle = "#edd3a8";
            c.fillRect(u.x - 6, -34, 12, 17);
            c.globalAlpha = 1;
          }
        } else soldier(c, u, t, 0.86);
        c.restore();
        const teamColor=u.side?'#d3987b':'#d5c78d';
        line(c,u.x-5,ground+u.depth+3,u.x+5,ground+u.depth+3,teamColor,2);
        if(sides[u.side].assault>0){const dir=u.side?-1:1;line(c,u.x-4*dir,ground+u.depth-66,u.x+3*dir,ground+u.depth-62,teamColor,2);line(c,u.x+3*dir,ground+u.depth-62,u.x-4*dir,ground+u.depth-58,teamColor,2);}
        if (u.hp < u.maxHp) {
          c.fillStyle = "#1c241d";
          c.fillRect(u.x - 13, ground + u.depth - 56, 26, 2);
          c.fillStyle = u.side ? "#b87460" : "#bcba87";
          c.fillRect(u.x - 13, ground + u.depth - 56, (26 * u.hp) / u.maxHp, 2);
        }
      }
      const friendly = units.filter((u) => u.side === 0);
      const front = friendly.length
        ? Math.max(...friendly.map((u) => u.x))
        : 230;
      c.strokeStyle = "#e0ca7e28";
      c.setLineDash([4, 8]);
      c.beginPath();
      c.moveTo(front, 410);
      c.lineTo(front, 558);
      c.stroke();
      c.setLineDash([]);
      if (sides[0].recon > 0) {
        const dx = 380 + Math.sin(t * 0.7) * 100,
          dy = 270;
        line(c, dx - 18, dy, dx + 18, dy, "#8a9984", 3);
        for (const a of [-18, 18]) ellipse(c, dx + a, dy, 12, 2, "#bdc3a6");
        c.strokeStyle = "#a6bd8630";
        c.beginPath();
        c.moveTo(dx, dy + 8);
        c.lineTo(dx - 120, 510);
        c.lineTo(dx + 120, 510);
        c.closePath();
        c.stroke();
      }
    }
    if (!sim?.paused) {
      for (let i = this.effects.length - 1; i >= 0; i--) {
        this.effects[i].life -= dt;
        if (this.effects[i].life <= 0)
          this.effectPool.push(this.effects.splice(i, 1)[0]);
      }
    }
    for (const e of this.effects) {
      const life = e.life / e.total;
      c.save();
      c.globalAlpha = life;
      if (e.type === "shot") {
        const y = ground - 29;
        line(
          c,
          e.x,
          y,
          e.to,
          y + (e.weapon === "cannon" ? 8 : 0),
          e.era < 3 ? "#c8b78a88" : "#eed4a6",
          e.weapon === "cannon" ? 3 : 1,
        );
        if (e.era >= 3) ellipse(c, e.x, y, 7, 4, "#f4cc7a");
      } else if (e.type === "death") {
        ellipse(c, e.x, ground + 4, 20, 4, "#332c25");
        line(c, e.x - 13, ground, e.x + 13, ground - 4, "#6e6d52", 6);
      } else if (e.type === "special") {
        c.strokeStyle = "#d5a26f70";
        c.setLineDash([7, 8]);
        c.beginPath();
        c.ellipse(e.x, ground, 155, 19, 0, 0, 7);
        c.stroke();
        c.setLineDash([]);
        for (let j = 0; j < 7; j++) {
          const x = e.x - 120 + j * 39,
            y = ground - 430 + (1 - life) * 390 + (j % 3) * 20;
          line(c, x - 25, y - 70, x, y, "#b8ae8e80", 2);
          ellipse(c, x, y, 3, 5, "#d4bf94");
        }
      } else if (e.type === "impact") {
        for (let j = 0; j < this.quality.profile.fragments; j++) {
          const x = e.x + Math.sin(j * 9) * 130 * (1 - life),
            y = ground - (1 - life) * 90 - (j % 3) * 18;
          ellipse(
            c,
            x,
            y,
            10 + (1 - life) * 16,
            9 + (1 - life) * 19,
            j % 3 ? "#706c51" : "#d0b174",
          );
        }
        ellipse(c, e.x, ground, 100 * (1 - life), 6, "#272d25");
      }
      c.restore();
    }
    // Atmospheric dust uses bounded procedural wisps.
    for (let i = 0; i < this.quality.profile.dust; i++) {
      const x = ((i * 273 + t * 7) % 1850) - 100,
        y = 440 + Math.sin(i * 2 + t * 0.15) * 28;
      c.drawImage(this.fogStamp, x - 150, y - 150, 300, 300);
    }
    if (era >= 5) {
      for (let i = 0; i < this.quality.profile.rain; i++) {
        const x = ((i * 83 + t * 110) % 1700) - 50,
          y = (i * 131 + t * 320) % 640;
        line(c, x, y, x - 4, y + 13, "#c9d1b915", 0.7);
      }
    }
    const vignette = c.createLinearGradient(0, 0, 1600, 0);
    vignette.addColorStop(0, "#10181480");
    vignette.addColorStop(0.22, "#10181400");
    vignette.addColorStop(0.78, "#10181400");
    vignette.addColorStop(1, "#10181480");
    c.fillStyle = vignette;
    c.fillRect(0, 0, 1600, 640);
    c.restore();
    this.surface.refresh();
  }
  cachedUnit(unit, time) {
    const state =
      unit.attack > 0 ? "attack" : unit.state === "march" ? "march" : "idle";
    const frame =
      state === "march"
        ? Math.floor((time * 8 + unit.phase) / (Math.PI / 2)) % 4
        : 0;
    const key = [
      unit.era,
      unit.slot,
      unit.side,
      unit.id % 5,
      unit.weapon,
      state,
      frame,
    ].join(":");
    let sprite = this.unitSprites.get(key);
    if (!sprite) {
      sprite = document.createElement("canvas");
      sprite.width = 112;
      sprite.height = 120;
      const ctx = sprite.getContext("2d");
      ctx.translate(50, 100);
      soldier(
        ctx,
        { ...unit, x: 0, hit: 0, state, phase: (frame * Math.PI) / 2 },
        0,
        0.86,
      );
      if (this.unitSprites.size >= 64)
        this.unitSprites.delete(this.unitSprites.keys().next().value);
      this.unitSprites.set(key, sprite);
    }
    return sprite;
  }

  paintTerrain(c, era) {
    if (this.bg?.width)
      c.drawImage(
        this.bg,
        0,
        0,
        this.bg.width,
        this.bg.height,
        0,
        -255,
        1600,
        1067,
      );
    else {
      c.fillStyle = "#555e4c";
      c.fillRect(0, 0, 1600, 640);
    }
    const shade = c.createLinearGradient(0, 0, 0, 640);
    shade.addColorStop(0, "#121e2820");
    shade.addColorStop(0.7, era > 4 ? "#444e4560" : "#b5a77805");
    shade.addColorStop(1, "#111912da");
    c.fillStyle = shade;
    c.fillRect(0, 0, 1600, 640);
    // Distant settlements change with technology.
    if (era > 0) {
      c.save();
      c.globalAlpha = 0.19;
      c.fillStyle = "#303e35";
      for (let i = 0; i < 16; i++) {
        const x = 420 + i * 43,
          y = 335 + Math.sin(i * 43) * 12,
          h = era > 4 ? 30 + (i % 4) * 20 : 17 + (i % 3) * 12;
        c.fillRect(x, y - h, 24, h);
        if (era < 4)
          path(
            c,
            [
              [x - 3, y - h],
              [x + 12, y - h - 12],
              [x + 28, y - h],
            ],
            "#303e35",
          );
        if (era > 3) line(c, x + 17, y - h, x + 17, y - h - 26, "#303e35", 5);
      }
      c.restore();
    }
    // Ground strata and deterministic gravel.
    const soil = c.createLinearGradient(0, 482, 0, 640);
    soil.addColorStop(0, "#77745c38");
    soil.addColorStop(0.15, "#383d2f90");
    soil.addColorStop(1, "#131b16");
    c.fillStyle = soil;
    c.fillRect(0, 482, 1600, 158);
    for (let n = 0; n < 170; n++) {
      const x = (n * 137.4) % 1600,
        y = 500 + ((n * 43.7) % 128);
      c.fillStyle = n % 3 ? "#9f9b791c" : "#0e17124a";
      c.fillRect(x, y, 2 + (n % 7), 1 + (n % 3));
    }
    for (let n = 0; n < 5; n++) {
      const x = (n * 331 + 87) % 1600;
      ellipse(c, x, 529 + (n % 2) * 29, 30, 3, "#141c1570");
      for (let i = 0; i < 5; i++)
        line(
          c,
          x + i * 6,
          525,
          x + i * 6 - 2,
          519 - (i % 3) * 3,
          "#9b997245",
          1,
        );
    }
  }
}
export function createRenderer(parent, getSim, onFrame, quality) {
  const scene = new Battlefield(getSim, onFrame, quality);
  const host = document.getElementById(parent);
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: Math.max(1, host.clientWidth),
    height: Math.max(1, host.clientHeight),
    resolution: 1,
    transparent: true,
    antialias: true,
    scene: [scene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
    fps: {
      target: 60,
      smoothStep: false,
      limit: 0,
      forceSetTimeOut: false,
    },
    input: { activePointers: 2 },
    audio: { noAudio: true },
    banner: false,
  });
  const observer =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver((entries) => {
          const rect = entries[0].contentRect;
          if (rect.width > 0 && rect.height > 0)
            game.scale.resize(Math.round(rect.width), Math.round(rect.height));
        })
      : null;
  observer?.observe(host);
  game.events.once("destroy", () => observer?.disconnect());
  return { game, scene };
}
