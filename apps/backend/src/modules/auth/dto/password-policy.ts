import { registerDecorator, ValidationOptions } from 'class-validator';

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.';

export function IsStrongPassword(opts?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: opts,
      validator: {
        validate: (v: any) => typeof v === 'string' && PASSWORD_REGEX.test(v),
        defaultMessage: () => PASSWORD_MESSAGE,
      },
    });
  };
}
