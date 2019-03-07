/**
 * @TODO vision, breeding, attacks, nutrition/energy balancing. Also, NNs need gaussian weights
 */

const pl = planck,
	Vec = pl.Vec2;
const MAX_TICK_RATE = 60;

let world = pl.World();
world.angularDrag = 0.9;
world.drag = 0.99;

let ppm = 20; //Pixels Per Metre!

let drawObjs = [];
let animals = [];
let objsForRemoval = [];
let foodToSpawn = [];

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
	animals.push(animal);
}

function setup() {
	createCanvas(600, 600);
	frameRate(MAX_TICK_RATE);

	for (let i = 0; i < 10; i++) {
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
	world.step(1 / (frameRate() || MAX_TICK_RATE));
	colorMode(RGB);
	background(0);

	strokeWeight(1);
	textSize(12);
	// if (drawObjs[1].brain)
	// 	drawObjs[1].brain.draw(width / 2, height / 2, 500, 50, 40);

	scale(ppm);
	strokeWeight(1 / ppm);
	textSize(50 / ppm);

	animals.forEach(animal => {
		if (animal.alive) animal.update();
	});
	drawObjs.forEach(obj => {
		obj.draw();
	});

	removeObjs();
}

function removeObjs() {
	if (objsForRemoval.length) {
		objsForRemoval.forEach(obj => {
			obj.world.destroyBody(obj.body);
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

function mousePressed() {
	//drawObjs.push(new Food(world, pixToWorld(mouseX), pixToWorld(mouseY), 1));
}

const ANIMAL_MAX_FORCE = 0.1;
const AMBIENT_ENERGY_EXPENSE = 0.001;
const START_HEALTH = 1000;
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
	}

	update() {
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
		}

		this.energyExpense += Math.abs(this.swimForce || this.turnForce) * 0.01;
		this.effortMade += wrapMod((this.swimForce || this.turnForce) * 2, TAU);

		if (this.swimForce)
			this.body.applyLinearImpulse(
				new Vec(
					Math.sin(-this.body.getAngle()),
					Math.cos(-this.body.getAngle())
				).mul(this.swimForce),
				this.pos,
				true
			);
		if (this.turnForce) this.body.applyAngularImpulse(this.turnForce, true);

		this.body.setLinearVelocity(
			this.body.getLinearVelocity().mul(this.world.drag)
		);
		this.body.setAngularVelocity(
			this.body.getAngularVelocity() * this.world.angularDrag
		);

		this.energy -= this.energyExpense + AMBIENT_ENERGY_EXPENSE;
		if (this.energy <= 0) this.alive = false;

		spawnFood();
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
		for (let i = 0; i < 2; i++) {
			let corner = i % 2 == 0 ? this.tailLeft : this.tailRight;
			push();
			translate(corner.x, corner.y + 0.3);
			fill(200);
			ellipse(0, 0, 0.5, 0.5);
			if (this.eyesOpen) {
				fill(0);
				ellipse(0, 0.1, 0.2, 0.2);
			} else {
				stroke(0);
				line(0.2, 0, -0.2, 0);
			}
			pop();
		}

		pop();
	}
}

let controls = {
	up: false,
	down: false,
	left: false,
	right: false
};

function keyPressed() {
	controls.up = keyIsDown(87) || false;
	controls.down = keyIsDown(83) || false;
	controls.left = keyIsDown(65) || false;
	controls.right = keyIsDown(68) || false;

	if (keyIsDown(76))
		addAnimal(new Animal(world, pixToWorld(mouseX), pixToWorld(mouseY)));
}
keyReleased = keyPressed;

function wrapMod(n, mod) {
	return ((n % mod) + mod) % mod;
}

const ANIMAL_ENERGY_EFFICIENCY = 0.9;
world.on("begin-contact", contact => {
	let a = contact
			.getFixtureA()
			.getBody()
			.getUserData(),
		b = contact
			.getFixtureB()
			.getBody()
			.getUserData();

	if (a instanceof Animal && b instanceof Food) {
		let animal = a instanceof Animal ? a : b;
		let food = a instanceof Food ? a : b;
		if (animal.alive) {
			objsForRemoval.push(food);
			animal.energy += food.body.getMass() * ANIMAL_ENERGY_EFFICIENCY;
			console.log(animal.energy);
		}
	} else if (a instanceof Animal && b instanceof Animal) {
		let animal1 = a,
			animal2 = b;
		if (animal1.alive ^ animal2.alive) {
			let dead = animal1.alive ? animal2 : animal1;
			objsForRemoval.push(dead);
			let foodCount = 10;
			let mass = dead.body.getMass() / foodCount;
			for (let i = 0; i < foodCount; i++) {
				let angle = random(TAU);
				let dist = random(2);
				foodToSpawn.push({
					world,
					x: dead.pos.x + pixToWorld(Math.sin(angle) * dist),
					y: dead.pos.y + pixToWorld(Math.cos(angle) * dist),
					mass
				});
			}
		}
	}
});
