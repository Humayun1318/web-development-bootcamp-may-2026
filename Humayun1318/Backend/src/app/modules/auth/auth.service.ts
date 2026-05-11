import AppError from "../../errorHelpers/AppError";
import { HTTP_STATUS } from "../../utils/HTTP_STATUS_CODE";
import { createNewAccessTokenUsingRefreshToken } from "../../utils/userTokens";



const getNewAccessTokenUsingRefreshToken = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      'No refresh token recieved from cookies',
    );
  }

  const accessTokenInfo =
    await createNewAccessTokenUsingRefreshToken(refreshToken);

  return {
    accessToken: accessTokenInfo,
  };
};


export const authService = {
  getNewAccessTokenUsingRefreshToken,
};