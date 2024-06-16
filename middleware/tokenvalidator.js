const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  try {
    let token;
    let authHeader = req.headers.Authorization || req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
      jwt.verify(token, process.env.DATABASE_SECRET, (err, decoded) => {
        if (err) {
          res.status(401);
          throw new Error("User is not authorized");
        }
        req.user = decoded.user;
        req.user.userId = decoded.userId;

        next();
      });
    } else {
      res.status(401).send({ message: "User is not authorized or token is missing" });
      return;
    }
  } catch (error) {
    next(error);
  }
};
const generateTestToken = () => {
  const user = { id: "testUser" };
  return jwt.sign(user, process.env.DATABASE_SECRET, { expiresIn: "1h" });
};
module.exports = { validateToken, generateTestToken };
