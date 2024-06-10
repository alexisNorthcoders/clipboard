import { verify } from "jsonwebtoken";

const validateToken = (req, res, next) => {
    try {
        let token;
        let authHeader = req.headers.Authorization || req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer")) {
            token = authHeader.split(" ")[1];
            verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    res.status(401);
                    throw new Error("User is not authorized");
                }
                req.user = decoded.user;
                next();
            });
        } else {
            res.status(401).send({message:"User is not authorized or token is missing"});
            return
        }
    } catch (error) {
        next(error);
    }
};

export default validateToken;