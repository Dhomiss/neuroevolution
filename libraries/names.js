const TADPOLE_FNAMES = [
	"John",
	"Sarah",
	"Aiden",
	"Roberto",
	"Tom",
	"Erin",
	"Jade",
	"Alicia",
	"Alyssa",
	"Biko",
	"Otto",
	"Florence",
	"Penny",
	"Caleb",
	"Jos",
	"Ashley",
	"Ashleigh",
	"Sam",
	"Jono",
	"Andrew",
	"Elliot",
	"Richard",
	"Jane",
	"Michael",
	"Nikki"
];

const TADPOLE_LNAMES = [
	"McDougal",
	"Williams",
	"Joy",
	"Bennett",
	"Klok",
	"Ross",
	"Scrivener",
	"Burns",
	"Allsobrook",
	"Bereton",
	"Beaven",
	"Chalken",
	"Hulbert",
	"Gilmour",
	"Holman",
	"Koo",
	"McLaughlan",
	"Papageorgiou",
	"Molloy",
	"Samy",
	"Stewart"
];

function generateName() {
	return `${
		TADPOLE_FNAMES[Math.floor(Math.random() * TADPOLE_FNAMES.length)]
	} ${TADPOLE_LNAMES[Math.floor(Math.random() * TADPOLE_LNAMES.length)]}`;
}
