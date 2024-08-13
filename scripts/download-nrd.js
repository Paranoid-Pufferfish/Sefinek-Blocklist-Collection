const { readFile, writeFile, mkdir, readdir, rm } = require('node:fs/promises');
const { join, basename, extname } = require('node:path');
const { createWriteStream, createReadStream } = require('node:fs');
const axios = require('axios');
const AdmZip = require('adm-zip');
const lzma = require('lzma-native');

const REGEX = /interseksualny|a(?:lloromantic|seksualn[ay])|genderfluid|(?:gender)?queer|t(?:rans(?:gender|sexual|exual)|wo\\-spirit)|(?:p(?:oly|an)s|allos|bis)exual|(?:polyamor|nonbinar|ga)y|l(?:esbi(?:jka|an)|gbtq(?:ia|\+))|(?:bi|a)gender|lgbtq?|pride|demi/gim;

const downloadFile = async (url, outputPath) => {
	console.log('GET', url);

	try {
		const res = await axios.get(url, { responseType: 'stream' });
		const writer = createWriteStream(outputPath);
		await new Promise((resolve, reject) => {
			res.data.pipe(writer);
			writer.on('finish', resolve);
			writer.on('error', reject);
		});
		writer.close();
	} catch (err) {
		console.error(`Failed to download ${url}.`, err.message);
		throw err;
	}
};

const processFile = async (filePath) => {
	const data = await readFile(filePath, 'utf-8');
	return data.split('\n').reduce((acc, line) => {
		if (REGEX.test(line)) {
			const domain = line.trim().split(/\s+/)[0];
			if (domain) acc.add(`0.0.0.0 ${domain}`);
		}
		return acc;
	}, new Set());
};

const extractZipFile = async (zipFilePath, extractToDir) => {
	const zip = new AdmZip(zipFilePath);
	await mkdir(extractToDir, { recursive: true });
	zip.extractAllTo(extractToDir, true);
};

const extractXzFile = (xzFilePath, extractToDir) => {
	return new Promise((resolve, reject) => {
		const decompressedFileName = basename(xzFilePath, '.xz');
		const decompressedPath = join(extractToDir, decompressedFileName);

		const inputStream = createReadStream(xzFilePath);
		const outputStream = createWriteStream(decompressedPath);
		const decompressor = lzma.createDecompressor();

		inputStream.pipe(decompressor).pipe(outputStream);

		outputStream.on('finish', () => {
			inputStream.close();
			outputStream.close();
			resolve(decompressedPath);
		});
		outputStream.on('error', reject);
	});
};

const processCompressedFile = async (filePath, extractToDir) => {
	await mkdir(extractToDir, { recursive: true });
	const ext = extname(filePath);
	const sites = new Set();

	if (ext === '.zip') {
		await extractZipFile(filePath, extractToDir);
	} else if (ext === '.xz') {
		const decompressedPath = await extractXzFile(filePath, extractToDir);
		const fileSites = await processFile(decompressedPath);
		fileSites.forEach(site => sites.add(site));
	}

	const files = await readdir(extractToDir);
	await Promise.all(files.map(async (file) => {
		const filePath = join(extractToDir, file);
		const fileSites = await processFile(filePath);
		fileSites.forEach(site => sites.add(site));
	}));

	return sites;
};

const main = async () => {
	const tmpDir = join(__dirname, '..', 'tmp');
	const outputFilePath = join(__dirname, '../blocklists/templates/sites/lgbtqplus2.txt');

	await mkdir(tmpDir, { recursive: true });

	const fileUrls = [
		// Random
		{ url: 'https://raw.githubusercontent.com/shreshta-labs/newly-registered-domains/main/nrd-1w.csv', name: 'shreshta-labs_nrd-1w.txt' },
		{ url: 'https://github.com/spaze/domains/raw/main/tld-cz.txt', name: 'spaze_tld-cz.txt' },

		// xRuffKez
		{ url: 'https://raw.githubusercontent.com/xRuffKez/NRD/main/nrd-30day_part1.txt', name: 'xRuffKez_nrd-30day-part1.txt' },
		{ url: 'https://raw.githubusercontent.com/xRuffKez/NRD/main/nrd-30day_part2.txt', name: 'xRuffKez_nrd-30day-part2.txt' },

		// whoisds
		{ url: 'https://whoisds.com//whois-database/newly-registered-domains/MjAyNC0wOC0xMi56aXA=/nrd', name: 'whoisds1.zip' },
		{ url: 'https://whoisds.com//whois-database/newly-registered-domains/MjAyNC0wOC0xMS56aXA=/nrd', name: 'whoisds2.zip' },
		{ url: 'https://whoisds.com//whois-database/newly-registered-domains/MjAyNC0wOC0xMC56aXA=/nrd', name: 'whoisds3.zip' },
		{ url: 'https://whoisds.com//whois-database/newly-registered-domains/MjAyNC0wOC0wOS56aXA=/nrd', name: 'whoisds4.zip' },

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

	const sites = new Set();

	for (const { url, name } of fileUrls) {
		const fileName = name || basename(url);
		const filePath = join(tmpDir, fileName);
		try {
			await downloadFile(url, filePath);

			const extractToDir = join(tmpDir, `extracted_${fileName}`);
			const fileSites = ['.zip', '.xz'].includes(extname(filePath))
				? await processCompressedFile(filePath, extractToDir)
				: await processFile(filePath);

			fileSites.forEach(site => sites.add(site));
		} catch (err) {
			console.error(`Error processing file ${fileName}: ${err.message}`);
		}
	}

	if (sites.size > 0) {
		const sortedSites = Array.from(sites).sort((a, b) => a.localeCompare(b));

		await writeFile(outputFilePath, `#       _____   ______   ______   _____   _   _   ______   _  __        ____    _         ____     _____   _  __  _        _____    _____   _______
#      / ____| |  ____| |  ____| |_   _| | \\ | | |  ____| | |/ /       |  _ \\  | |       / __ \\   / ____| | |/ / | |      |_   _|  / ____| |__   __|
#     | (___   | |__    | |__      | |   |  \\| | | |__    | ' /        | |_) | | |      | |  | | | |      | ' /  | |        | |   | (___      | |
#      \\___ \\  |  __|   |  __|     | |   | . \` | |  __|   |  <         |  _ <  | |      | |  | | | |      |  <   | |        | |    \\___ \\     | |
#      ____) | | |____  | |       _| |_  | |\\  | | |____  | . \\        | |_) | | |____  | |__| | | |____  | . \\  | |____   _| |_   ____) |    | |
#     |_____/  |______| |_|      |_____| |_| \\_| |______| |_|\\_\\       |____/  |______|  \\____/   \\_____| |_|\\_\\ |______| |_____| |_____/     |_|
#
#                                             The best collection of blocklists for your DNS server
#                                                       https://blocklist.sefinek.net
#
# Title: Blocks LGBT websites solely based on their addresses
# Description: N/A
# Expires: 1 day
# Count: ${sortedSites.length}
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
# -------------------------------------------------------------------------------------------------------------------------------------------------------
${sortedSites.join('\n')}`, { flag: 'w' });
	}

	await rm(tmpDir, { recursive: true, force: true });
	console.log('Processing complete! Check the file at:', outputFilePath);
};

main().catch(console.error);