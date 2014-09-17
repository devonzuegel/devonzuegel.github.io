//Feed me javascript here.

projects = [
		{
			name: 'Paper Trail',
			type: 'Javascript application',
			dates: {
				start: Date.parse('April 2014'),
				end: 'present',
			},
			website: 'www.stanford.edu/~devonz/paper_trail',
			bullet_pts: [
				'Learned Javascript while creating an app that presents information about corporations\' political contributions.',
			],
			include: true,

		}, {

			name: 'Experimental Websites',
			type: 'HTML5 web design',
			dates: {
				start: Date.parse('September 2010'),
				end: Date.parse('June 2012'),
			},
			website: 'www.freestyle.mvla.net/~DevonZ/project0/index.html',
			bullet_pts: [
			 'Represents my first exposure & experimentation with web design',
			],
			include: false,

		}, {

			name: 'Unwanted',
			type: 'Flash Animation',
			dates: {
				start: Date.parse('May 2011'),
				end: Date.parse('June 2011'),
			},
			website: 'www.freestyle.mvla.net/~DevonZ/project2/pages/animation.html',
			bullet_pts: [
				'Created graphics with Adobe Illustrator & Photoshop, animated graphics in Adobe Flash',
				'Won 2nd place for best 2010 junior animation at Freestyle Academy',
			],
			include: true,

		}, {

			name: 'In Other Words',
			type: 'Documentary book',
			dates: {
				start: Date.parse('January 2011'),
				end: Date.parse('April 2011'),
			},
			website: 'www.blurb.com/books/2092327-in-other-words',
			bullet_pts: [
				'Gained experience in interview- & research-based writing & in layout design',
				'Won 2nd place for best 2011 junior documentary book at Freestyle Academy',
				'Endorsed by Morgan Autism Center',
			],
			include: true,
		}
];

contact = {
	name: {
		first: 'Devon',
		middle: 'Kristine',
		last: 'Zuegel',
	},
	cell: '(650) 906 - 7099',
	github: 'www.github.com/devonzuegel',
	email: [
		'devonz@cs.stanford.edu',
		'devonzuegel@gmail.com',
	],
};

general = {
	school: 'Stanford University',
	class_yr: 'Class of 2016',
	gpa: 3.6,
	major: {
		degree: 'B.S.',
		dept: 'Computer Science',
		track: 'Network Engineering & Analysis',
	},
	minor: {
		degree: 'B.S.',
		dept: 'Economics',
	}
};

courses = [
	{ 
		name: {
			dept: 'CS',
			num: 	'106A',
			title: 'Programming Methodology',
		},
		languages: [ 'Java' ],
		completed: true,
		school_year: 'freshman',
		quarter: 'spring',
	},	{ 
		name: {
			dept: 'CS',
			num: 	'106B',
			title: 'Programming Abstractions',
		},
		languages:  [ 'C++' ],
		completed: true,
		school_year: 'freshman',
		quarter: 'summer',
	},	{ 
		name: {
			dept: 'CS',
			num: 	'107',
			title: 'Computer Organization & Systems',
		},
		languages:  [ 'C' ],
		completed: true,
		school_year: 'sophomore',
		quarter: 'winter',
	},	{ 
		name: {
			dept: 'CS',
			num: 	'103',
			title: 'Mathematical Foundations of Computing',
		},
		languages: [],
		completed: true,
		school_year: 'sophomore',
		quarter: 'autumn',
	}, { 
		name: {
			dept: 'CS',
			num: 	'142',
			title: 'Web Applications',
		},
		languages:  [ 'Rails', 'Javascript'],
		completed: true,
		school_year: 'sophomore',
		quarter: 'winter',
	}, { 
		name: {			
			dept: 'CS',
			num: 	'227B',
			title: 'General Game Playing',
		},
		languages:  [ 'Java' ],
		completed: true,
		school_year: 'sophomore',
		quarter: 'spring',
	}, {
		name: {
			dept: 'CS',
			num: 	'161',
			title: 'Algorithms',
		},
		languages:  [],
		completed: false,
		school_year: 'junior',
		quarter: 'autumn',
	}, {
		name: {
			dept: 'CS',
			num: 	'109',
			title: 'Probability for Computer Scienists',
		},
		languages:  [],
		completed: false,
		school_year: 'junior',
		quarter: 'autumn',
	}, {
		name: {
			dept: 'CS',
			num: 	'147',
			title: 'Human-Computer Interaction',
		},
		languages:  [],
		completed: false,
		school_year: 'junior',
		quarter: 'autumn',
	}, {
		name: {
			dept: 'CS',
			num: 	'42',
			title: 'Contemporary Javascript',
		},
		languages:  ['Javascript'],
		completed: false,
		school_year: 'junior',
		quarter: 'autumn',
	}, {
		name: {
			dept: 'CS',
			num: 	'546',
			title: 'Seminar on Liberation Technologies',
		},
		languages:  [],
		completed: false,
		school_year: 'junior',
		quarter: 'autumn',
	}
];


skills = {
	'programming languages': [
		// comfort is 0-5, 5 being most comfortable
		{
			name: 'Ruby',
			months_exp: 5,
			comfort: 3,
		}, {
			name: 'HTML / Jade',
			months_exp: 5,				
			comfort: 5,
		}, {
			name: 'C',
			months_exp: 6,
			comfort: 3,
		}, {
			name: 'C++',
			months_exp: 5,
			comfort: 3,
		}, {
			name: 'Java',
			months_exp: 5,
			comfort: 3,
		},
	],

	'web frameworks': [
		{
			name: 'Node.js',
			months_exp: 6,
			comfort: 5,
		}, {
			name: 'Ruby on Rails',
			months_exp: 6,
			comfort: 4,
		},
	],

	languages: [
		{

			name: 'English',
			level: 'native',

		}, {

			name: 'Spanish',
			level: 'working',

		}, {


			name: 'German',
			level: 'Intermediate',

		}
	],

	adobe: [
		{
			name: 'Photoshop',
			months_exp: 48,
		}, {
			name: 'Illustrator',
			months_exp: 48,
		}, {
			name: 'InDesign', 
			months_exp: 8,
		}
	],

	misc: [
		{
			name: 'Wordpress',
			months_exp: 16,
		}
	]
};


employment_exp = [
	{

		title: ['Software Engineering Intern'],
		employer: 'Formation 8',
		dates: {
			start: 'June 2014',
			end: 'September 2014',
		},
		website: 'www.formation8.com',
		bullet_pts: [],

	}, {
		
		title: [
			'Editor Emeritus',
			'Editor in Chief',
			'Executive Editor',
			'Opinions Editor',
			'Deputy News Editor',
		],
		employer: 'The Stanford Review',
		dates: {
			start: 'September 2012',
			end: 'present',
		},
		website: 'www.stanfordreview.org',
		bullet_pts: [
			'Led campaign to grow online presence of paper, increased viewership by 50% within a month',
			'Managed & mentored staff writers to ensure the Review went to print on time',
			'Contributed 1-2 articles to each biweekly issue & designed graphics',
		],

	}, {
		
		title: ['Section Leader'],
		employer: 'Computer Science Department, Stanford University',
		dates: {
			start: 'January 2014',
			end: 'present',
		},
		website: 'www.cs198.stanford.edu',
		bullet_pts: [
			'Teach weekly section, hold office hours, & assess assignments for the first & second introductory CS courses (in Java and C++).',
		],

	}, {
		
		title: ['Marketing Intern'],
		employer: 'Quixey',
		dates: {
			start: 'May 2012',
			end: 'July 2012',
		},
		website: 'www.quixey.com',
		bullet_pts: [
			'Designed & built a website for the press announcing the company’s investment round',
		],

	}, {
		
		title: ['Human Factors Intern'],
		employer: 'NASA Ames Research Center',
		dates: {
			start: 'June 2012',
			end: 'August 2012',
		},
		website: 'www.nasa.gov',
		bullet_pts: [
			'Designed & built a searchable photo archive in Excel that was sharable across the network',
			'Constructed an experimental replica of the workstation on the International Space Station',
		],

	}, {
		
		title: ['Volunteer Puppy Raiser'],
		employer: 'Guide Dogs for the Blind',
		dates: {
			start: 'April 2012',
			end: 'June 2013',
		},
		website: 'www.guidedogs.com',
		bullet_pts: [
			'Raised a puppy to lead & accompany a blind individual throughout his daily life',
			'Attended weekly trainings to learn how to work with the puppy',
		],

	}
];

projects = [
	{

		name: 'Paper Trail',
		type: 'Javascript application',
		dates: {
			start: 'April 2014',
			end: 'present',
		},
		website: 'www.stanford.edu/~devonz/paper_trail',
		bullet_pts: [
			'Learned Javascript while creating an app that presents information about corporations\' political contributions.',
		],
		include: true,

	}, {

		name: 'Experimental Websites',
		type: 'HTML5 web design',
		dates: {
			start: 'September 2010',
			end: 'June 2012',
		},
		website: 'www.freestyle.mvla.net/~DevonZ/project0/index.html',
		bullet_pts: [
		 'Represents my first exposure & experimentation with web design',
		],
		include: false,

	}, {

		name: 'Unwanted',
		type: 'Flash Animation',
		dates: {
			start: 'May 2011',
			end: 'June 2011',
		},
		website: 'www.freestyle.mvla.net/~DevonZ/project2/pages/animation.html',
		bullet_pts: [
			'Created graphics with Adobe Illustrator & Photoshop, animated graphics in Adobe Flash',
			'Won 2nd place for best 2010 junior animation at Freestyle Academy',
		],
		include: true,

	}, {

		name: 'In Other Words',
		type: 'Documentary book',
		dates: {
			start: 'January 2011',
			end: 'April 2011',
		},
		website: 'www.blurb.com/books/2092327-in-other-words',
		bullet_pts: [
			'Gained experience in interview- & research-based writing & in layout design',
			'Won 2nd place for best 2011 junior documentary book at Freestyle Academy',
			'Endorsed by Morgan Autism Center',
		],
		include: true,

	}
];

hobbies = [
	'Triathlon',
	'Backpacking',
	'Graphic design & photography',
	'Jazz guitar & singing',
];