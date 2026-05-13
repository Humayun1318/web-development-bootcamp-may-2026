import type { Response } from 'express';
import { envVars } from '../config/env';
import type { IAuthTokens } from '../modules/user/user.interface';

export const setAuthCookie = (res: Response, tokenInfo: IAuthTokens) => {
  if (tokenInfo.accessToken) {
    res.cookie('accessToken', tokenInfo.accessToken, {
      httpOnly: true,
      secure: envVars.NODE_ENV === 'production',
      sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax',
    });
  }

  if (tokenInfo.refreshToken) {
    res.cookie('refreshToken', tokenInfo.refreshToken, {
      httpOnly: true,
      secure: envVars.NODE_ENV === 'production',
      sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax',
    });
  }
};
