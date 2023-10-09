import { useEffect, useState } from 'react';

import { CheckCorrect, FlagMarkSolid } from './Icons';
import graphNetwork from '../GraphNetwork';
import { EntityType } from '../model/Graph';
import TrustScore from '../model/TrustScore';

const TrustReactionButtons = (props) => {
  const [score, setScore] = useState({
    trusted: false,
    distrusted: false,
  });

  const event = props.event;
  const wot = props?.wot;

  useEffect(() => {
    const v = wot?.vertice;
    const s = v?.score as TrustScore;
    setScore({
      trusted: s?.trusted(),
      distrusted: s?.distrusted(),
    });
  }, [wot]); // Everytime the wot changes, its a new object

  function trustBtnClicked(e) {
    e.preventDefault();
    e.stopPropagation();

    let val = !score.trusted ? 1 : 0;
    graphNetwork.publishTrust(event.id, val, EntityType.Item);

    setScore({
        trusted: !score.trusted,
        distrusted: false,
    });
  }

  function distrustBtnClicked(e) {
    e.preventDefault();
    e.stopPropagation();

    let val = !score.distrusted ? -1 : 0;
    graphNetwork.publishTrust(event.id, val, EntityType.Item);

    setScore({
        trusted: false,
        distrusted: !score.distrusted
    });
  }

  return (
    <>
      <a
        className={`btn-ghost trust-btn btn-sm flex-1 justify-center hover:bg-transparent btn content-center gap-2 rounded-none ${
          score.trusted ? 'trusted' : 'hover:trusted text-neutral-500'
        }`}
        onClick={(e) => trustBtnClicked(e)}
        title={score.trusted ? 'Trusted' : 'Trust'}
      >
        {score.trusted ? (
          <CheckCorrect size={18} fill="green" stroke="currentColor" />
        ) : (
          <CheckCorrect size={18} fill="none" stroke="currentColor" />
        )}
        {(!props.standalone && wot?.vertice?.score?.renderTrustCount()) || ''}
      </a>
      <a
        className={`btn-ghost trust-btn btn-sm flex-1 justify-center hover:bg-transparent btn content-center gap-2 rounded-none ${
          score.distrusted ? 'distrusted' : 'hover:distrusted text-neutral-500'
        }`}
        onClick={(e) => distrustBtnClicked(e)}
        title={score.distrusted ? 'Distrusted' : 'Distrust'}
      >
        {score.distrusted ? (
          <FlagMarkSolid size={18} fill="red" stroke="currentColor" />
        ) : (
          <FlagMarkSolid size={18} fill="none" stroke="currentColor" />
        )}
        {(!props.standalone && wot?.vertice?.score?.renderDistrustCount()) || ''}
      </a>
    </>
  );
};

export default TrustReactionButtons;
