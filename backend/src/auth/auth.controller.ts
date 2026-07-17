import { Controller, Get, Post, Body, Res, HttpStatus, HttpCode } from '@nestjs/common';

import { RegisterUserDto } from './dto/register-user.dto';
import { SignupUserDto } from './dto/signup-user.dto';
import { AuthService } from './auth.service';
import { LoginResponse } from './interfaces';
import { Auth, GetUser } from './decorators';

import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from 'src/user/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'REGISTER',
    description: 'Public endpoint to register a new user with "user" Role.',
  })
  @ApiResponse({ status: 201, description: 'Ok', type: LoginResponse })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Server error' }) //Swagger
  register(@Body() createUserDto: RegisterUserDto) {
    return this.authService.registerUser(createUserDto);
  }

  @Post('signup')
  @ApiOperation({
    summary: 'SIGNUP',
    description:
      'Public endpoint to sign up. The first account on an empty user table becomes ADMIN; every subsequent account is a USER.',
  })
  @ApiResponse({ status: 201, description: 'Ok', type: LoginResponse })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Server error' })
  signup(@Body() signupUserDto: SignupUserDto) {
    return this.authService.signupUser(signupUserDto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'LOGIN',
    description: 'Public endpoint to login and get the Access Token',
  })
  @ApiResponse({ status: 200, description: 'Ok', type: LoginResponse })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 500, description: 'Server error' }) //Swagger
  async login(@Res() response, @Body() loginUserDto: LoginUserDto) {
    const data = await this.authService.loginUser(loginUserDto.email, loginUserDto.password);
    response.status(HttpStatus.OK).send(data);
  }

  @Get('me')
  @ApiOperation({
    summary: 'ME',
    description: 'Private endpoint returning the currently authenticated user.',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Ok', type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Auth()
  me(@GetUser() user: User) {
    return user;
  }

  @Post('logout')
  @ApiOperation({
    summary: 'LOGOUT',
    description:
      'Private endpoint acknowledging logout. Stateless JWT — the client discards the token.',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Ok' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.OK)
  @Auth()
  logout() {
    return { message: 'Logged out' };
  }

  @Get('refresh-token')
  @ApiOperation({
    summary: 'REFRESH TOKEN',
    description:
      'Private endpoint allowed for logged in users to refresh the Access Token before it expires.',
  })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Ok', type: LoginResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized' }) //Swagger
  @Auth()
  refreshToken(@GetUser() user: User) {
    return this.authService.refreshToken(user);
  }
}
