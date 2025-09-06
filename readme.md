app.use((req, _res, next) => { console.log('[REQ]', req.method, req.path, 'origin=', req.get('origin')); next(); });
