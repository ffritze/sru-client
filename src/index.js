/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* SRU client for Node.js and browser
*
* Copyright (C) 2015, 2017-2018 University Of Helsinki (The National Library Of Finland)
*
* This file is part of sru-client
*
* sru-client program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Lesser General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* sru-client is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import fetch from 'node-fetch';
import {DOMParser, XMLSerializer} from 'xmldom';

const DEFAULT_VERSION = '1.0';
const MAXIMUM_RECORDS = '1000';
const RECORD_SCHEMA = 'marcxml';

export default function ({serverUrl, version, maximumRecords, recordSchema}) {
	version = version || DEFAULT_VERSION;
	maximumRecords = maximumRecords || MAXIMUM_RECORDS;
	recordSchema = recordSchema || RECORD_SCHEMA;

	return {
		searchRetrieve
	};

	async function searchRetrieve(query) { // eslint-disable-line require-await
		return pump();

		async function pump(startRecord = 1, results = []) {
			let lastRecordPosition;

			const url = `${serverUrl}?operation=searchRetrieve&version=${version}&maximumRecords=${maximumRecords}&recordSchema=${recordSchema}&startRecord=${startRecord}&query=${query}`;
			const response = await fetch(url);
			const serializer = new XMLSerializer();
			const doc = new DOMParser().parseFromString(await response.text());

			const numberOfRecords = Number(doc.getElementsByTagName('zs:numberOfRecords').item(0).textContent);
			const records = doc.getElementsByTagName('zs:record');

			for (let i = 0; i < records.length; i++) {
				const record = records.item(i);

				for (let k = 0; k < record.childNodes.length; k++) {
					const childNode = record.childNodes.item(k);

					if (childNode.localName === 'recordData') {
						results.push(serializer.serializeToString(childNode));
					} else if (childNode.localName === 'recordPosition' && i === records.length - 1) {
						lastRecordPosition = Number(childNode.textContent);
					}
				}
			}

			if (lastRecordPosition < numberOfRecords) {
				return pump(lastRecordPosition + 1, results);
			}

			return results;
		}
	}
}
