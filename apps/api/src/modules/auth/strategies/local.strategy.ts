import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({ usernameField: 'email' });
  }

  validate(email: string, password: string): { id: string } {
    void email;
    void password;
    throw new UnauthorizedException('Local strategy not wired');
  }
}
