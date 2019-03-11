/**
 * @TODO	Vision, breeding, nutrition/energy balancing, and... well, evolution.
 */

const pl = planck,
	Vec = pl.Vec2;
const MAX_TICK_RATE = 60;

let world = pl.World();
world.angularDrag = 0.9;
world.drag = 0.99;

let ppm = 20; //Pixels Per Metre!

let drawObjs = [];
let updateObjs = [];
let animals = [];
let objsForRemoval = [];
let foodToSpawn = [];
let eggsToSpawn = [];

let player = null;

function spawnFood() {
	foodToSpawn.forEach(food => {
		drawObjs.push(new Food(food.world, food.x, food.y, food.mass));
	});
	foodToSpawn = [];
}

function pixToWorld(n) {
	return n / ppm;
}

function addAnimal(animal) {
	drawObjs.push(animal);
	updateObjs.push(animal);
	animals.push(animal);
	return animal;
}

function setup() {
	createCanvas(600, 600);
	frameRate(MAX_TICK_RATE);

	const INITIAL_ANIMALS = 0;
	for (let i = 0; i < INITIAL_ANIMALS; i++) {
		addAnimal(
			new Animal(
				world,
				pixToWorld(random(1, width - 1)),
				pixToWorld(random(1, height - 1)),
				1,
				new NeuralNetwork([1, 3, 2])
			)
		);
	}
	player = addAnimal(
		new Animal(world, pixToWorld(width / 2), pixToWorld(height / 2))
	);
	player.body.setAngle(PI);
	addAnimal(new Animal(world, pixToWorld(width / 2), pixToWorld(height / 2)));

	let tl = new Vec();
	let tr = new Vec(pixToWorld(width), 0);
	let br = new Vec(pixToWorld(width), pixToWorld(height));
	let bl = new Vec(0, pixToWorld(height));
	let leftWall = new pl.Edge(tl, bl);
	let bottomWall = new pl.Edge(bl, br);
	let rightWall = new pl.Edge(br, tr);
	let topWall = new pl.Edge(tl, tr);
	let walls = world.createBody();
	walls.createFixture(leftWall);
	walls.createFixture(bottomWall);
	walls.createFixture(rightWall);
	walls.createFixture(topWall);
}

function draw() {
	//if (keyIsPressed) keyDown();
	world.step(1 / MAX_TICK_RATE /*(frameRate() || MAX_TICK_RATE)*/);
	colorMode(RGB);
	background(0);

	if (animals.length > 2 && animals[1].brain)
		animals[1].brain.draw(width / 2, height / 2, 500, 50, 40, 10);

	push();
	scale(ppm);
	strokeWeight(1 / ppm);
	textSize(50 / ppm);

	updateObjs.forEach(obj => {
		obj.update();
	});
	drawObjs.forEach(obj => {
		obj.draw();
	});

	pop();
	removeObjs();
	spawnFood();
	spawnEggs();

	strokeWeight(1);
	textSize(18);
	textAlign(LEFT, LEFT);
	stroke(0);
	fill("#F00");
	text(frameRate().toFixed(2), 20, 20);
	if (player) {
		fill("#F00");
		text(player.energy, 20, 40);
	}
}

function removeObjs() {
	if (objsForRemoval.length) {
		objsForRemoval.forEach(obj => {
			obj.world.destroyBody(obj.body);
		});
		updateObjs = updateObjs.filter(obj => {
			return objsForRemoval.indexOf(obj) < 0;
		});
		drawObjs = drawObjs.filter(obj => {
			return objsForRemoval.indexOf(obj) < 0;
		});
		animals = animals.filter(obj => {
			return objsForRemoval.indexOf(obj) < 0;
		});
		objsForRemoval = [];
	}
}

class Food {
	constructor(world, x, y, mass) {
		this.world = world;
		this.radius = Math.sqrt(mass / PI);
		this.body = world.createBody({
			type: "dynamic",
			position: Vec(x, y)
		});
		this.body.createFixture(new pl.Circle(this.radius), {
			density: 1,
			friction: 0.8,
			restitution: 0
		});
		this.body.setUserData(this);
		this.pos = this.body.getPosition();
	}

	draw() {
		push();
		translate(this.pos.x, this.pos.y);
		rotate(this.body.getAngle());
		noStroke();
		fill("#640");
		ellipse(0, 0, this.radius * 2, this.radius * 2);
		pop();
	}
}

const BULLET_VEL = 10;
class Bullet {
	constructor(world, animal) {
		this.world = world;
		this.radius = 0.1;
		let position = new Vec(
			animal.pos.x + Math.sin(-animal.body.getAngle()) * 1.5,
			animal.pos.y + Math.cos(-animal.body.getAngle()) * 1.5
		);
		this.body = world.createBody({
			type: "dynamic",
			position
		});
		this.body.createFixture(new pl.Circle(this.radius), {
			density: 1,
			friction: 1,
			restitution: 0
		});
		this.body.setUserData(this);
		this.pos = this.body.getPosition();
		this.body.setLinearVelocity(
			new Vec(
				Math.sin(-animal.body.getAngle()) * BULLET_VEL,
				Math.cos(-animal.body.getAngle()) * BULLET_VEL
			)
		);
	}

	draw() {
		push();
		translate(this.pos.x, this.pos.y);
		rotate(this.body.getAngle());
		noStroke();
		fill(64);
		ellipse(0, 0, this.radius * 2, this.radius * 2);
		pop();
	}
}

function mousePressed() {
	drawObjs.push(new Food(world, pixToWorld(mouseX), pixToWorld(mouseY), 0.1));
}

const ANIMAL_MAX_FORCE = 0.1;
const ENERGY_EXPENSE_MULTIPLIER = 1.5;
const AMBIENT_ENERGY_EXPENSE = 0.2;
const ANIMAL_ENERGY_EFFICIENCY = 0.5;
const FOOD_MASS_TO_ENERGY_MULTIPLIER = 1000;
const START_HEALTH = 1000;
const BULLET_TIMEOUT = 1000;
const MATING_DURATION = 1000;
class Animal {
	constructor(world, x, y, size = 1, brain = null) {
		this.world = world;
		this.body = world.createBody({
			type: "dynamic",
			position: Vec(x, y)
		});
		this.head = new Vec(Math.sin(0), Math.cos(0)).mul(size);
		this.tailLeft = new Vec(Math.sin(PI * 0.8), Math.cos(PI * 0.8)).mul(
			size
		);
		this.tailRight = new Vec(Math.sin(PI * 1.2), Math.cos(PI * 1.2)).mul(
			size
		);
		this.tailMid = {
			x: (this.tailLeft.x + this.tailRight.x) / 2,
			y: (this.tailLeft.y + this.tailRight.y) / 2
		};
		this.body.createFixture(
			pl.Polygon([this.head, this.tailLeft, this.tailRight]),
			{
				density: 1,
				friction: 0.5,
				restitution: 0
			}
		);

		this.body.setUserData(this);
		this.pos = this.body.getPosition();
		this.swimForce = 0;
		this.turnForce = 0;
		this.effortMade = 0;
		this.eyesOpen = true;
		this.brain = brain;
		this.energy = START_HEALTH;
		this.alive = true;
		this.energyExpense = 0;
		this.hue = random(255);
		this.lastShot = 0;
		this.proximateObjs = [];
		this.name = generateName();
		this.mate = null;
		this.mateTime = 0;
	}

	update() {
		this.proximateObjs = drawObjs
			.sort((obj, otherObj) => {
				return (
					Vec.distance(this.pos, obj.pos) >
					Vec.distance(this.pos, otherObj.pos)
				);
			})
			.filter((obj, i) => {
				return i != 0;
			});

		this.body.setLinearVelocity(
			this.body.getLinearVelocity().mul(this.world.drag)
		);
		this.body.setAngularVelocity(
			this.body.getAngularVelocity() * this.world.angularDrag
		);

		if (this.alive) {
			if (this.brain) {
				this.brain.layers[0][0].value = map(
					noise(frameCount / 100),
					0,
					1,
					-2,
					2
				);
				this.brain.compute();
				this.swimForce =
					this.brain.layers.output[0].value * ANIMAL_MAX_FORCE;
				this.turnForce =
					this.brain.layers.output[1].value * ANIMAL_MAX_FORCE;
			} else {
				this.swimForce = 0;
				this.turnForce = 0;
				this.swimForce += controls.up ? ANIMAL_MAX_FORCE : 0;
				this.swimForce += controls.down ? -ANIMAL_MAX_FORCE : 0;
				this.turnForce += controls.left ? -ANIMAL_MAX_FORCE : 0;
				this.turnForce += controls.right ? ANIMAL_MAX_FORCE : 0;

				if (controls.shoot) this.shoot();
			}

			this.energyExpense +=
				Math.abs(this.swimForce || this.turnForce) *
				ENERGY_EXPENSE_MULTIPLIER;
			this.effortMade += wrapMod(
				(this.swimForce || this.turnForce) * 2,
				TAU
			);

			if (this.swimForce)
				this.body.applyLinearImpulse(
					new Vec(
						Math.sin(-this.body.getAngle()),
						Math.cos(-this.body.getAngle())
					).mul(this.swimForce),
					this.pos,
					true
				);
			if (this.turnForce)
				this.body.applyAngularImpulse(this.turnForce, true);

			this.energy -= this.energyExpense + AMBIENT_ENERGY_EXPENSE;
			if (this.energy <= 0) this.alive = false;

			this.energyExpense = 0;
		}
	}

	draw() {
		push();

		translate(this.pos.x, this.pos.y);
		rotate(this.body.getAngle() + Math.sin(this.effortMade) * 0.1);
		noStroke();
		colorMode(HSB);
		fill(
			lerpColor(
				color(this.hue, 24, 127),
				color(this.hue, 255, 127),
				this.energy / START_HEALTH
			)
		);
		beginShape(TRIANGLES);
		for (var f = this.body.getFixtureList(); f; f = f.getNext()) {
			f.getShape().m_vertices.forEach(v => {
				vertex(v.x, v.y);
			});
		}
		endShape();
		push();
		translate(this.tailMid.x, this.tailMid.y);
		rotate(Math.sin(this.effortMade) * 0.5 + -this.turnForce * 8);
		ellipse(0, 0, 0.4, 0.4);
		beginShape(TRIANGLES);
		vertex(Math.sin(TAU * 0.75) * 0.2, Math.cos(TAU * 0.75) * 0.8);
		vertex(Math.sin(TAU * 0.5) * 0.2, Math.cos(TAU * 0.5) * 0.8);
		vertex(Math.sin(TAU * 0.25) * 0.2, Math.cos(TAU * 0.25) * 0.8);
		endShape();
		pop();

		this.eyesOpen = this.alive
			? this.eyesOpen ^ (random() < (this.eyesOpen ? 0.01 : 0.1))
			: false;
		const drawEye = (pos, quarry = null) => {
			push();
			translate(pos.x, pos.y + 0.3);
			fill(200);
			ellipse(0, 0, 0.5, 0.5);
			if (this.alive) {
				if (this.eyesOpen) {
					if (quarry) {
						let quarryRel = Vec.sub(Vec.add(this.pos, pos), quarry);
						rotate(
							-satan2(quarryRel.x, quarryRel.y) -
								this.body.getAngle()
						);
					}
					fill(0);
					ellipse(0, 0.1, 0.2, 0.2);
				} else {
					stroke(0);
					line(0.2, 0, -0.2, 0);
				}
			} else {
				stroke(0);
				rotate(TAU * 0.125);
				line(0.2, 0, -0.2, 0);
				rotate(TAU * 0.25);
				line(0.2, 0, -0.2, 0);
			}
			pop();
		};

		drawEye(
			this.tailLeft,
			this.proximateObjs[0] ? this.proximateObjs[0].pos : null
		);
		drawEye(
			this.tailRight,
			this.proximateObjs[1]
				? this.proximateObjs[1].pos
				: this.proximateObjs[0]
				? this.proximateObjs[0].pos
				: null
		);
		pop();
	}

	shoot() {
		if (millis() - this.lastShot > BULLET_TIMEOUT) {
			drawObjs.push(new Bullet(this.world, this));
			this.lastShot = millis();
		}
	}

	decompose() {
		objsForRemoval.push(this);
		let foodCount = 10;
		let mass = this.body.getMass() / foodCount;
		for (let i = 0; i < foodCount; i++) {
			let angle = random(TAU);
			let dist = random(2);
			foodToSpawn.push({
				world,
				x: this.pos.x + pixToWorld(Math.sin(angle) * dist),
				y: this.pos.y + pixToWorld(Math.cos(angle) * dist),
				mass
			});
		}
	}
}

const EGG_RADIUS = 0.25;
class Egg {
	constructor(mum, dad) {
		this.world = mum.world;
		this.radius = EGG_RADIUS;
		this.body = this.world.createBody({
			type: "dynamic",
			position: Vec(mum.pos.x, mum.pos.y)
		});
		this.body.createFixture(new pl.Circle(this.radius), {
			density: 0.8,
			friction: 0.8,
			restitution: 0.4
		});
		this.body.setUserData(this);
		this.pos = this.body.getPosition();
		this.born = millis();
	}

	update() {
		if (millis() - this.born > 20000) {
			objsForRemoval.push(this);
			addAnimal(
				new Animal(
					this.world,
					this.pos.x,
					this.pos.y,
					1,
					new NeuralNetwork([1, 3, 2])
				)
			);
		}
	}

	draw() {
		push();
		translate(this.pos.x, this.pos.y);
		rotate(this.body.getAngle());
		noStroke();
		fill("#FF9");
		ellipse(0, 0, this.radius * 2, this.radius * 2 * 1.2);
		pop();
	}
}

function addEgg(mum, dad) {
	eggsToSpawn.push({ mum, dad });
}

function spawnEggs() {
	eggsToSpawn.forEach(egg => {
		let newEgg = new Egg(egg.mum, egg.dad);
		updateObjs.push(newEgg);
		drawObjs.push(newEgg);
	});
	eggsToSpawn = [];
}

let controls = {
	up: false,
	down: false,
	left: false,
	right: false,
	shoot: false
};

function keyPressed() {
	//console.log(keyCode);
	controls.up = keyIsDown(87) || false;
	controls.down = keyIsDown(83) || false;
	controls.left = keyIsDown(65) || false;
	controls.right = keyIsDown(68) || false;
	controls.shoot = keyIsDown(32) || false;

	// if (keyIsDown(76))
	// 	addAnimal(new Animal(world, pixToWorld(mouseX), pixToWorld(mouseY)));
	if (keyIsDown(81)) {
		console.log(player);
	}
}
keyReleased = keyPressed;

/**
 * atan2 but it's actually useful
 */
function satan2(x, y) {
	return wrapMod(atan2(x, y) + PI, TAU);
}

function wrapMod(n, mod) {
	return ((n % mod) + mod) % mod;
}

world.on("begin-contact", contact => {
	let a = contact
			.getFixtureA()
			.getBody()
			.getUserData(),
		b = contact
			.getFixtureB()
			.getBody()
			.getUserData();

	if (
		(a instanceof Animal && b instanceof Food) ||
		(b instanceof Animal && a instanceof Food)
	) {
		let animal = a instanceof Animal ? a : b;
		let food = a instanceof Food ? a : b;

		let facingFood = isFacing(animal, food);
		if (animal.alive && facingFood) {
			objsForRemoval.push(food);
			animal.energy +=
				food.body.getMass() *
				FOOD_MASS_TO_ENERGY_MULTIPLIER *
				ANIMAL_ENERGY_EFFICIENCY;
		}
	} else if (a instanceof Animal && b instanceof Animal) {
		let animal1 = a,
			animal2 = b;
		if (animal1.alive ^ animal2.alive) {
			let corpse = animal1.alive ? animal2 : animal1;
			let scavenger = animal2.alive ? animal2 : animal1;

			if (isFacing(scavenger, corpse)) {
				corpse.decompose();
			}
		} else if (animal1.alive && animal2.alive) {
			if (!animal1.mate && !animal2.mate) {
				animal1.mate = animal2;
				animal2.mate = animal1;
				animal1.mateTime = animal2.mateTime = millis();
			}
		}
	} else if (
		(a instanceof Animal && b instanceof Bullet) ||
		(b instanceof Animal && a instanceof Bullet)
	) {
		let animal = a instanceof Animal ? a : b;

		animal.decompose();
	}

	if (a instanceof Bullet) objsForRemoval.push(a);
	if (b instanceof Bullet) objsForRemoval.push(b);
});

world.on("end-contact", contact => {
	let a = contact
			.getFixtureA()
			.getBody()
			.getUserData(),
		b = contact
			.getFixtureB()
			.getBody()
			.getUserData();
	if (a instanceof Animal && b instanceof Animal) {
		let john = a,
			sally = b;
		if (john.mate == sally && sally.mate == john) {
			john.mate = null;
			sally.mate = null;
			if (
				millis() - john.mateTime > MATING_DURATION &&
				millis() - sally.mateTime > MATING_DURATION
			) {
				addEgg(sally, john);
				sally.enery -= 500;
				john.energy -= 500;
			}
			john.mateTime = 0;
			sally.mateTime = 0;
		}
	}
});

function isFacing(obj, targ) {
	let targRel = Vec.sub(targ.pos, obj.pos);
	let targAngle = satan2(targRel.x, targRel.y);
	let objAngle = wrapMod(-obj.body.getAngle() + Math.PI, TAU);
	let theta = targAngle - objAngle;
	return -PI / 2 < theta && theta < PI / 2;
}
