import AuthService from "@repo/services/auth";
import MailerService from "@repo/services/mailer";
import UserService from "@repo/services/user";

export const mailerService = new MailerService();
export const authService = new AuthService(mailerService);
export const userService = new UserService();
