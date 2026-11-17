import {validationResult} from 'express-validator'

export const validarCampos = (req,res,next) =>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const erroresSeguros = errors.array().map(({ type, msg, path, location }) => ({ type, msg, path, location }));
        return res.status(400).json({errors:erroresSeguros})
    }
    next()
}
