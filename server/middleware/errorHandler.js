import {STATUS_CODE} from '../utils/httpStatusCode.js'

const errorHandler = (err, req, res, next) => {
    // console.error(err.stack);
  
    res.status(err.statusCode || 500).json({
      statusCode: err.statusCode || 500,
      status: STATUS_CODE.ERROR,
      message: err.message || "Server Error",
    });
  };
  
  export default errorHandler;