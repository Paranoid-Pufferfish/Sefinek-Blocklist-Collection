const { readFile, writeFile, mkdir, readdir, rm } = require('node:fs/promises');
const { join, basename, extname } = require('node:path');
const { createWriteStream, createReadStream } = require('node:fs');
const axios = require('axios');
const AdmZip = require('adm-zip');
const lzma = require('lzma-native');

const CATEGORIES = [
	{
		title: 'Blocks anime websites solely based on their addresses',
		category: 'Anime',
		regex: /anime/gi,
		file: 'anime/main.txt'
	},
	{
		title: 'Blocks LGBT websites solely based on their addresses',
		category: 'LGBTQ+',
		regex: /interseksualny|a(?:lloromantic|seksualn[ay])|genderfluid|(?:gender)?queer|t(?:rans(?:gender|sexual|exual)|wo\\-spirit)|(?:(?:(?:(?:poly|allo)|bi)|pan)|demi)sexual|(?:polyamor|nonbinar|ga)y|l(?:esbi(?:jka|an)|gbtq(?:ia|\+))|(?:bi|a)gender|lgbtq?|pride/gim,
		file: 'sites/lgbtqplus2.txt'
	}
];

const WHITELIST = [
	'*.stoplgbt.pl'
];

const downloadFile = async (url, outputPath) => {
	console.log(`Downloading file from ${url} to ${outputPath}...`);

	try {
		const res = await axios.get(url, { responseType: 'stream' });
		await new Promise((resolve, reject) => {
			const writer = createWriteStream(outputPath);
			res.data.pipe(writer);

			writer.on('finish', () => {
				writer.close();
				resolve();
			});

			writer.on('error', err => {
				writer.close();
				reject(err);
			});
		});
	} catch (err) {
		console.error(`Failed to download ${url}. Error: ${err.message}`);
		throw err;
	}
};

const isWhitelisted = domain => {
	return WHITELIST.some(whitelistItem => {
		if (whitelistItem.startsWith('*.')) {
			const baseDomain = whitelistItem.slice(2);
			return domain === baseDomain || domain.endsWith(`.${baseDomain}`);
		} else {
			return domain === whitelistItem;
		}
	});
};

const processFile = async (filePath, category) => {
	console.log('Processing files...');
	const matchedSites = new Set();

	const fileStream = createReadStream(filePath, 'utf-8');
	const readline = require('readline');
	const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
	for await (const line of rl) {
		const domain = line.trim().split(/\s+/)[0];
		if (domain && !isWhitelisted(domain) && category.regex.test(line)) {
			matchedSites.add(`0.0.0.0 ${domain}`);
		}
	}

	console.log(`Found ${matchedSites.size} matching sites for the category: ${category.category}`);
	global.gc && global.gc();
	return matchedSites;
};

const extractZipFile = async (zipFilePath, extractToDir) => {
	console.log('Extracting ZIP file...');
	const zip = new AdmZip(zipFilePath);
	await mkdir(extractToDir, { recursive: true });
	zip.extractAllTo(extractToDir, true);
};

const extractXzFile = (xzFilePath, extractToDir) => {
	console.log('Extracting XZ file...');
	return new Promise((resolve, reject) => {
		const decompressedPath = join(extractToDir, basename(xzFilePath, '.xz'));
		const inputStream = createReadStream(xzFilePath);
		const outputStream = createWriteStream(decompressedPath);
		const decompressor = lzma.createDecompressor();

		inputStream.pipe(decompressor).pipe(outputStream);
		outputStream.on('finish', () => resolve(decompressedPath));
		outputStream.on('error', reject);
	});
};

const processCompressedFile = async (filePath, extractToDir) => {
	await mkdir(extractToDir, { recursive: true });
	const sites = {};

	let filesToProcess = [];

	if (extname(filePath) === '.zip') {
		await extractZipFile(filePath, extractToDir);
		filesToProcess = await readdir(extractToDir);
	} else if (extname(filePath) === '.xz') {
		const decompressedPath = await extractXzFile(filePath, extractToDir);
		filesToProcess = [basename(decompressedPath)];
	}

	for (const file of filesToProcess) {
		const fullPath = join(extractToDir, file);
		for (const category of CATEGORIES) {
			const fileSites = await processFile(fullPath, category);
			if (!sites[category.file]) sites[category.file] = new Set();
			fileSites.forEach(site => sites[category.file].add(site));
		}

		global.gc && global.gc();
	}

	return sites;
};

const generateHeader = (title, category, count) => {
	return `#       _____   ______   ______   _____   _   _   ______   _  __        ____    _         ____     _____   _  __  _        _____    _____   _______
#      / ____| |  ____| |  ____| |_   _| | \\ | | |  ____| | |/ /       |  _ \\  | |       / __ \\   / ____| | |/ / | |      |_   _|  / ____| |__   __|
#     | (___   | |__    | |__      | |   |  \\| | | |__    | ' /        | |_) | | |      | |  | | | |      | ' /  | |        | |   | (___      | |
#      \\___ \\  |  __|   |  __|     | |   | . \` | |  __|   |  <         |  _ <  | |      | |  | | | |      |  <   | |        | |    \\___ \\     | |
#      ____) | | |____  | |       _| |_  | |\\  | | |____  | . \\        | |_) | | |____  | |__| | | |____  | . \\  | |____   _| |_   ____) |    | |
#     |_____/  |______| |_|      |_____| |_| \\_| |______| |_|\\_\\       |____/  |______|  \\____/   \\_____| |_|\\_\\ |______| |_____| |_____/     |_|
#
#                                             The best collection of blocklists for your DNS server
#                                                       https://blocklist.sefinek.net
#
# Title: ${title || 'Unknown'}
# Category: ${category || 'Unknown'}
# Description: N/A
# Expires: 1 day
# Count: ${count || 'Unknown'}
# Author: Sefinek (https://sefinek.net) <contact@sefinek.net>
# Modified by: Nobody
# Source: N/A
# License: Unknown
# Release: <Release>
# Version: <Version>
# Last update: <LastUpdate>
#
# 〢 About:
# This file is part of the Sefinek Blocklist Collection, maintained by github.com/sefinek24.
# If you come across any false positives, please create a new Issue or Pull request on GitHub. Thank you!
#
# 〢 Warning:
# By using this file, you acknowledge that the author is not liable for any damages or losses that may arise from its use, although the likelihood of such events is low.
#
# -------------------------------------------------------------------------------------------------------------------------------------------------------`;
};

const main = async () => {
	const tmpDir = join(__dirname, '..', 'tmp');
	await rm(tmpDir, { recursive: true, force: true });
	await mkdir(tmpDir, { recursive: true });

	const fileUrls = [
		// Random
		{ url: 'https://raw.githubusercontent.com/shreshta-labs/newly-registered-domains/main/nrd-1w.csv', name: 'shreshta-labs_nrd-1w.txt' },
		{ url: 'https://github.com/spaze/domains/raw/main/tld-cz.txt', name: 'spaze_tld-cz.txt' },

		// xRuffKez
		{ url: 'https://raw.githubusercontent.com/xRuffKez/NRD/main/nrd-30day_part1.txt', name: 'xRuffKez_nrd-30day-part1.txt' },
		{ url: 'https://raw.githubusercontent.com/xRuffKez/NRD/main/nrd-30day_part2.txt', name: 'xRuffKez_nrd-30day-part2.txt' },

		// whoisds
		{ url: 'https://whoisds.com/whois-database/newly-registered-domains/MjAyNC0wOC0xMi56aXA=/nrd', name: 'whoisds1.zip' },
		{ url: 'https://whoisds.com/whois-database/newly-registered-domains/MjAyNC0wOC0xMS56aXA=/nrd', name: 'whoisds2.zip' },
		{ url: 'https://whoisds.com/whois-database/newly-registered-domains/MjAyNC0wOC0xMC56aXA=/nrd', name: 'whoisds3.zip' },
		{ url: 'https://whoisds.com/whois-database/newly-registered-domains/MjAyNC0wOC0wOS56aXA=/nrd', name: 'whoisds4.zip' },

		// tb0hdan
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/generic_lgbt/domain2multi-lgbt00.txt.xz', name: 'tb0hdan_generic-lgbt.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/generic_gay/domain2multi-gay00.txt.xz', name: 'tb0hdan_generic-gay.xz' },

		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/germany/domain2multi-de00.txt.xz', name: 'tb0hdan_domain2multi-de00.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/germany/domain2multi-de01.txt.xz', name: 'tb0hdan_domain2multi-de01.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/germany/domain2multi-de02.txt.xz', name: 'tb0hdan_domain2multi-de02.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/germany/domain2multi-de03.txt.xz', name: 'tb0hdan_domain2multi-de03.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/germany/domain2multi-de04.txt.xz', name: 'tb0hdan_domain2multi-de04.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/germany/domain2multi-de05.txt.xz', name: 'tb0hdan_domain2multi-de05.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/germany/domain2multi-de06.txt.xz', name: 'tb0hdan_domain2multi-de06.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/germany/domain2multi-de07.txt.xz', name: 'tb0hdan_domain2multi-de07.xz' },

		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/poland/domain2multi-pl00.txt.xz', name: 'tb0hdan_domain2multi-pl00.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/poland/domain2multi-pl01.txt.xz', name: 'tb0hdan_domain2multi-pl01.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/poland/domain2multi-pl02.txt.xz', name: 'tb0hdan_domain2multi-pl02.xz' },

		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/united_states/domain2multi-us00.txt.xz', name: 'tb0hdan_domain2multi-us00.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/united_kingdom/domain2multi-uk00.txt.xz', name: 'tb0hdan_domain2multi-uk00.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/united_kingdom/domain2multi-uk01.txt.xz', name: 'tb0hdan_domain2multi-uk01.xz' },
		{ url: 'https://github.com/tb0hdan/domains/raw/master/data/united_kingdom/domain2multi-uk02.txt.xz', name: 'tb0hdan_domain2multi-uk02.xz' }
	];

	const results = {};
	for (const { url, name } of fileUrls) {
		const fileName = name || basename(url);
		const filePath = join(tmpDir, fileName);
		const extractToDir = join(tmpDir, `${fileName}_extracted_`);

		try {
			await downloadFile(url, filePath);

			let fileSites = {};
			if (['.zip', '.xz'].includes(extname(filePath))) {
				fileSites = await processCompressedFile(filePath, extractToDir);
			} else {
				for (const category of CATEGORIES) {
					const categorySites = await processFile(filePath, category);
					if (!fileSites[category.file]) fileSites[category.file] = new Set();
					categorySites.forEach(site => fileSites[category.file].add(site));
				}
			}

			for (const [categoryFile, sites] of Object.entries(fileSites)) {
				if (!results[categoryFile]) results[categoryFile] = new Set();
				sites.forEach(site => results[categoryFile].add(site));
			}

			fileSites = null;
			global.gc && global.gc();
		} catch (err) {
			console.error(`Error processing file ${fileName}: ${err.message}`);
		}
	}

	for (const [fileName, sites] of Object.entries(results)) {
		const sortedSites = Array.from(sites).sort();
		const category = CATEGORIES.find(cat => cat.file === fileName);
		const header = generateHeader(category.title, category.category, sortedSites.length);

		await writeFile(join(__dirname, `../blocklists/templates/${fileName}`), header + sortedSites.join('\n'), { flag: 'w' });

		const zeroCount = sortedSites.filter(site => site.startsWith('0.0.0.0')).length;
		console.log(`Number of lines starting with "0.0.0.0" in ${fileName}: ${zeroCount}`);
	}

	await rm(tmpDir, { recursive: true, force: true });
	console.log('Processing complete!');
};

main().catch(console.error);