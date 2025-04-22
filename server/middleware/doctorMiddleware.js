import User from "../models/User.js";
import ErrorResponse from "../utils/errorResponse.js";

const verifyDoctor = async(req, res, next) => {

    try {
        const id = req.user._id;
        const user = await User.findById(id);
        if (!user?.isDoctor) {
            return next(new ErrorResponse("You are not a doctor to perform this action", 403));
          }
    } catch (error) {
        next(error);
        
    }
  next();
}
export default verifyDoctor;