class NeuralNetwork {
	constructor(layers) {
		this.layers = [];
		if (layers.length > 0) {
			for (let i = 0; i < layers.length; i++) {
				this.layers.push([]);
				for (let j = 0; j < layers[i]; j++) {
					this.layers[i].push(new Node());
				}
			}
		} else return null;
		this.layers.input = this.layers[0];
		this.layers.hidden = this.layers.slice(1, this.layers.length - 1);
		this.layers.output = this.layers[this.layers.length - 1];
		this.layers.forEach((layer, i) => {
			let nextLayer = this.layers[i + 1];
			if (nextLayer) {
				layer.forEach(node => {
					nextLayer.forEach(nextNode => {
						node.forwardsTo(nextNode);
					});
				});
			}
		});
	}

	compute() {
		this.layers.forEach((layer, i) =>
			layer.forEach(node => {
				if (i > 0) {
					let sum = 0;
					node.backward.forEach(synapse => {
						sum += synapse.from.value * synapse.weight;
					});
					sum += node.bias;
					sum = Math.tanh(sum);
					node.value = sum;
				}
			})
		);
	}

	draw(x, y, w, spacing, nodeSize, cxnWidth = 1) {
		let nodeToPos = {};

		this.layers.forEach((layer, n, array) => {
			let layersLength = array.length;
			layer.forEach((node, m, array) => {
				let nodesLength = array.length;
				nodeToPos[node.id] = createVector(
					x - w / 2 + w * (n / (layersLength - 1)),
					y - (spacing * (nodesLength - 1)) / 2 + spacing * m
				);
			});
		});
		stroke(255);
		this.layers.forEach(layer =>
			layer.forEach(node => {
				let pos = nodeToPos[node.id];
				node.forward.forEach(synapse => {
					let nextPos = nodeToPos[synapse.to.id];
					stroke(synapse.weight > 0 ? "#0F0" : "#F00");
					strokeWeight(abs(synapse.weight) * cxnWidth);
					line(pos.x, pos.y, nextPos.x, nextPos.y);
				});
			})
		);

		noStroke();
		ellipseMode(CENTER);
		this.layers.forEach(layer =>
			layer.forEach(node => {
				let pos = nodeToPos[node.id];
				fill("#00F");
				ellipse(pos.x, pos.y, nodeSize, nodeSize);
				textAlign(CENTER, CENTER);
				fill(255);
				text(node.value.toFixed(1), pos.x, pos.y);
			})
		);
	}
}

class Node {
	constructor(value = 0) {
		this.id = `_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
		this.forward = [];
		this.backward = [];
		this.bias = random(-1, 1);
		this.value = value;
	}

	forwardsTo(otherNode) {
		let synapse = {
			from: this,
			weight: random(-1, 1),
			to: otherNode
		};
		this.forward.push(synapse);
		otherNode.backward.push(synapse);
	}
}

function sigmoid(x) {
	return 1 / (1 + Math.pow(Math.E, -x));
}
