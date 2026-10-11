const axios = require('axios');

const COOKIE = process.env.FF_COOKIE || '_ga=GA1.1.1765779302.1752765382; session=1d04c5db-eaf8-47df-a739-e9425cc6da6c; session.sig=mGXqvo2TEdy6dDcQin16C-4G664; _ga_GDNE9EKYHZ=GS2.1.s1752928624$o7$g1$t1752928647$j37$l0$h0';

const HEADERS = {
    'authority': 'congdong.ff.garena.vn',
    'accept': 'application/json, text/plain, */*',
    'content-type': 'application/json',
    'cookie': COOKIE,
    'origin': 'https://congdong.ff.garena.vn',
    'referer': 'https://congdong.ff.garena.vn/tinh-diem',
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
};

const garenaApi = {
    findMatches: async (accountId, start, end) => {
        const payload = { accountId, startTime: start.unix(), endTime: end.unix() };
        const response = await axios.post('https://congdong.ff.garena.vn/league-score-api/player/find-match', payload, { headers: HEADERS });
        return response.data?.matches;
    },

    getMatchDetails: async (matchIds) => {
        const promises = matchIds.map(id => 
            axios.post('https://congdong.ff.garena.vn/league-score-api/match', { matchId: id }, { headers: HEADERS })
                 .catch(() => null) 
        );
        const responses = await Promise.all(promises);
        return responses.map(res => res?.data?.match).filter(Boolean); 
    }
};

module.exports = garenaApi;