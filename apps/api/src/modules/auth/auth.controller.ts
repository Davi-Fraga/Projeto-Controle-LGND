import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginThrottleGuard } from './guards/login-throttle.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LoginThrottleGuard)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto.email, dto.password);
    this.setRefreshCookie(response, result.refreshToken);
    return { data: { accessToken: result.accessToken, user: result.user } };
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const cookieName = this.authService.getRefreshCookieName();
    const result = await this.authService.refresh(request.cookies?.[cookieName]);
    this.setRefreshCookie(response, result.refreshToken);
    return { data: { accessToken: result.accessToken, user: result.user } };
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const cookieName = this.authService.getRefreshCookieName();
    await this.authService.logout(request.cookies?.[cookieName]);
    response.clearCookie(cookieName, { path: '/api/auth' });
    return { data: { success: true } };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { sub: string }) {
    return { data: await this.authService.getMe(user.sub) };
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie(this.authService.getRefreshCookieName(), refreshToken, {
      httpOnly: true,
      secure: this.authService.isProduction(),
      sameSite: 'lax',
      maxAge: this.authService.getRefreshCookieMaxAgeMs(),
      path: '/api/auth',
    });
  }
}
