import { generator as graphcooljsgenerator } from './graphcool-js'
import { generator as graphcooltsgenerator } from './graphcool-ts'
import { generator as bindingtsgenerator } from './binding-ts'
import { generator as bindingjsgenerator } from './binding-js'
import { Generator } from '../types';

export const generators: { [key: string]: Generator} = {
    'graphcool-js': graphcooljsgenerator,
    'graphcool-ts': graphcooltsgenerator,
    'binding-ts': bindingtsgenerator,
    'binding-js': bindingjsgenerator,
}