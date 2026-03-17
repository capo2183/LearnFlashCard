const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export const initGoogleServices = () => {
    return new Promise((resolve, reject) => {
        // Load GAPI
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = () => {
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        discoveryDocs: [
                            'https://sheets.googleapis.com/$discovery/rest?version=v4',
                            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
                        ],
                    });
                    gapiInited = true;
                    if (gisInited) resolve();
                } catch (err) {
                    console.error("GAPI Init Error:", err);
                    reject(err);
                }
            });
        };
        document.body.appendChild(gapiScript);

        // Load GIS
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.onload = () => {
            try {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '', // defined at request time
                });
                gisInited = true;
                if (gapiInited) resolve();
            } catch (err) {
                console.error("GIS Init Error:", err);
                reject(err);
            }
        };
        document.body.appendChild(gisScript);
    });
};

export const signIn = (loginHint = '') => {
    return new Promise((resolve, reject) => {
        try {
            tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    console.error("GIS Response Error:", resp);
                    reject(resp);
                    return;
                }
                // 重要：獲取權權後必須設定給 gapi 才能進行後續 Sheets API 操作
                window.gapi.client.setToken(resp);
                console.log("Token received and set for GAPI");
                resolve(resp);
            };

            const options = { prompt: '' };
            if (loginHint) {
                options.login_hint = loginHint;
            }
            tokenClient.requestAccessToken(options);
        } catch (err) {
            console.error("SignIn Error:", err);
            reject(err);
        }
    });
};

export const signOut = () => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
        window.google.accounts.oauth2.revoke(token.access_token, () => {
            window.gapi.client.setToken('');
            localStorage.removeItem('flashcard_token');
            localStorage.removeItem('flashcard_user');
            localStorage.removeItem('flashcard_user_email');
            window.location.reload();
        });
    } else {
        localStorage.removeItem('flashcard_token');
        localStorage.removeItem('flashcard_user');
        localStorage.removeItem('flashcard_user_email');
        window.location.reload();
    }
};

export const getUserInfo = async (accessToken) => {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    return await response.json();
};

export const getAllCards = async (spreadsheetId) => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'A:G',
        });
        const rows = response.result.values;
        if (!rows || rows.length === 0) return [];
        
        const rawHeaders = rows[0].map(h => (h || "").toString().trim().toLowerCase());
        const firstRowIsHeader = rawHeaders.includes('id') || rawHeaders.includes('front');
        
        const findIdx = (name, defaultIdx) => {
            const idx = rawHeaders.indexOf(name.toLowerCase());
            return (idx !== -1 && firstRowIsHeader) ? idx : defaultIdx;
        };

        const idxMap = {
            id: findIdx('id', 0),
            front: findIdx('front', 1),
            back: findIdx('back', 2),
            interval: findIdx('interval', 3),
            repetition: findIdx('repetition', 4),
            efactor: findIdx('efactor', 5),
            nextReviewDate: findIdx('nextReviewDate', 6)
        };

        const dataRows = firstRowIsHeader ? rows.slice(1) : rows;

        return dataRows.map((row, index) => {
            return {
                id: row[idxMap.id] || "",
                front: row[idxMap.front] || "",
                back: row[idxMap.back] || "",
                interval: row[idxMap.interval] || 0,
                repetition: row[idxMap.repetition] || 0,
                efactor: row[idxMap.efactor] || 2.5,
                nextReviewDate: row[idxMap.nextReviewDate] || "",
                rowIndex: firstRowIsHeader ? index + 2 : index + 1
            };
        });
    } catch (err) {
        console.error("Fetch Cards Error:", err);
        return [];
    }
};

export const saveNewCard = async (spreadsheetId, card) => {
    const values = [[
        card.id,
        card.front,
        card.back,
        card.interval,
        card.repetition,
        card.efactor,
        card.nextReviewDate
    ]];
    return await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'A1',
        valueInputOption: 'RAW',
        resource: { values },
    });
};

export const deleteCardByRow = async (spreadsheetId, rowIndex) => {
    const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = spreadsheet.result.sheets[0].properties.sheetId;

    return await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }
            ]
        }
    });
};

export const updateCardProgress = async (spreadsheetId, rowIndex, progress) => {
    const range = `D${rowIndex}:G${rowIndex}`;
    const values = [[
        progress.interval,
        progress.repetition,
        progress.efactor,
        progress.nextReviewDate
    ]];

    return await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values },
    });
};

export const findOrCreateSpreadsheet = async () => {
    const response = await window.gapi.client.drive.files.list({
        q: "name = '學習單字卡_資料庫' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
        fields: 'files(id, name)',
    });

    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
    } else {
        const sheet = await window.gapi.client.sheets.spreadsheets.create({
            resource: { properties: { title: '學習單字卡_資料庫' } },
        });
        const spreadsheetId = sheet.result.spreadsheetId;

        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'A1',
            valueInputOption: 'RAW',
            resource: {
                values: [['id', 'front', 'back', 'interval', 'repetition', 'efactor', 'nextReviewDate']]
            },
        });
        return spreadsheetId;
    }
};

export const initializeIncompleteCards = async (spreadsheetId, cardsToInit) => {
    if (!cardsToInit || cardsToInit.length === 0) return 0;

    const data = cardsToInit.map(card => {
        const newId = crypto.randomUUID();
        const nextReviewDate = new Date(Date.now() - 60000).toISOString();
        
        return {
            range: `A${card.rowIndex}:G${card.rowIndex}`,
            values: [[
                newId,
                card.front,
                card.back,
                0, // interval
                0, // repetition
                2.5, // efactor
                nextReviewDate
            ]]
        };
    });

    try {
        await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: {
                valueInputOption: 'RAW',
                data: data
            }
        });
        return cardsToInit.length;
    } catch (err) {
        console.error("Initialize Cards Error:", err);
        return 0;
    }
};
