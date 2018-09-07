/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* SRU client for Node.js and browser
*
* Copyright (C) 2015, 2017-2018 University Of Helsinki (The National Library Of Finland)
* Copyright (C) 2018 Florian Fritze (Stuttgart University Library)
*
* This file is part of sruclient
*
* sruclient program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Lesser General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* sruclient is distributed in the hope that it will be useful,
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

var fetch = require('node-fetch');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var XMLWriter = require('xml-writer');

const DEFAULT_VERSION = '1.1';
const MAXIMUM_RECORDS = '100';
const RECORD_SCHEMA = 'marcxml';

function SRU({serverUrl, version, maximumRecords, recordSchema}) {
	var version = version || DEFAULT_VERSION;
	var maximumRecords = maximumRecords || MAXIMUM_RECORDS;
	var recordSchema = recordSchema || RECORD_SCHEMA;

	return {
		searchRetrieve
	};

	async function searchRetrieve({query,title,creator,xmlPrefix}) { // eslint-disable-line require-await
		return pump();

		async function pump(startRecord = 1) {
			let lastRecordPosition;
            var url;
            var results="";
            var xw = new XMLWriter;
            xw.startDocument('1.0', 'UTF-8');
            xw.startElement("records");
			if (`${query}` != "undefined") {
				url = `${serverUrl}?operation=searchRetrieve&version=${version}&maximumRecords=${maximumRecords}&recordSchema=${recordSchema}&startRecord=${startRecord}&query=%22${query}%22`;
			} else if (`${title}` != "undefined") {
				url = `${serverUrl}?operation=searchRetrieve&version=${version}&maximumRecords=${maximumRecords}&recordSchema=${recordSchema}&startRecord=${startRecord}&query=${recordSchema}.title=%22${title}%22`;
			} else if (`${creator}` != "undefined") {
				url = `${serverUrl}?operation=searchRetrieve&version=${version}&maximumRecords=${maximumRecords}&recordSchema=${recordSchema}&startRecord=${startRecord}&query=${recordSchema}.creator=%22${creator}%22`;
            }
            console.log(url);
			return await fetch(url).then( res => {
                return res.text().then(function(result) {
                    const doc = new DOMParser().parseFromString(result,'text/xml');
                    const numberOfRecords = Number(doc.getElementsByTagName(xmlPrefix+'numberOfRecords').item(0).textContent);
                    const records = doc.getElementsByTagName(xmlPrefix+'record');
                    for (let i = 0; i < records.length; i++) {
                        const record = records.item(i);

                        for (let k = 0; k < record.childNodes.length; k++) {
                            const childNode = record.childNodes.item(k);

                            if (childNode.localName === 'recordData') {
                                var cNode=childNode.childNodes.item(0);
                                results=results+(new XMLSerializer().serializeToString(cNode));
                            } else if (childNode.localName === 'recordPosition' && i === records.length - 1) {
                                lastRecordPosition = Number(childNode.textContent);
                            }
                        }
                    }
                    if (lastRecordPosition < numberOfRecords) {
                        return pump(lastRecordPosition + 1, results);
                    }
                    xw.writeRaw(results.toString());
                    xw.endElement();
                    xw.endDocument();
                    return xw.toString();
                });
            }, reason => {
                console.log(reason); // Error!
            });
		}
	}
}

module.exports = SRU;