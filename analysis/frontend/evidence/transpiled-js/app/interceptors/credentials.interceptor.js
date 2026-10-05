export const credentialsInterceptor = (req, next) => {
    if (req.url.startsWith('http://localhost:10032')) {
        return next(req.clone({ withCredentials: true }));
    }
    return next(req);
};
