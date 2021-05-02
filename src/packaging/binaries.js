import { join as joinPath, dirname } from 'path';
import appRootDir from 'app-root-dir';
import getPlatform from './get-platform';

const IS_PROD = process.env.NODE_ENV === 'production';

export const binPath = IS_PROD
  ? joinPath(dirname(appRootDir.get()), 'Resources/bin')
  : joinPath(appRootDir.get(), 'resources', getPlatform());
