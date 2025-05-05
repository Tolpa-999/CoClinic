import User from "../models/User.js";
import ErrorResponse from "../utils/errorResponse.js";

const verifyDoctor = async(req, res, next) => {

    try {
        const id = req.user.userId;
        const user = await User.findById(id);

        console.log(user)


        if (!user?.isDoctor) {
            return next(new ErrorResponse("You are not a doctor to perform this action", 403));
        }

        if (!user.approved) {
          return next(new ErrorResponse("You are not allow to perform this action as a doctor till an andmin prove your identity", 403));
        }
        
    } catch (error) {
        next(error);
        
    }
  next();
}
export default verifyDoctor;