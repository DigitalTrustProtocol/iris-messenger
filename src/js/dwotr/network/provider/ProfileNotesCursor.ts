import { NotesCursor } from './NotesCursor';
import { FeedOption } from '../WOTPubSub';


class ProfileNotesCursor extends NotesCursor {

  constructor(opt: FeedOption) {
    super(opt);
    this.kinds.add(1);
    this.authors.add(opt.user!);
  }

}

export default ProfileNotesCursor;
