import User from "../models/User.js";
import ErrorResponse from "../utils/errorResponse.js";

const verifyAdmin = async(req, res, next) => {

    try {
        const id = req.user.userId;  
        const user = await User.findById(id);

        if (!user) {
          if (user?.isAdmin != true) {
            return next(new ErrorResponse("user not found", 404));
          }
        }


        console.log("user in admin middleware ===> ", user)

        
        if (user?.isAdmin != true) {
            return next(new ErrorResponse("You are not admin to perform this action", 403));
          }

        if (!user?.approved) {
          return next(new ErrorResponse("You are not allow to perform this action till an andmin prove your identity", 403));
        }
    } catch (error) {
        next(error);
        
    }
  next();
}
export default verifyAdmin;