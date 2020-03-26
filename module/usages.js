const commandLineUsage = require('command-line-usage');

const raidSections = [
	{
		header: 'A typical app',
		content: 'Generates something {italic very} important.'
	},
	{
		header: 'Options',
		optionList: [
			{
				name: 'input',
				typeLabel: '{underline file}',
				description: 'The input to process.'
			},
			{
				name: 'help',
				description: 'Print this usage guide.'
			}
		]
	}
];

function getRaidUsages() {
	return commandLineUsage(raidSections);
}

module.exports.getRaidUsages = getRaidUsages;
