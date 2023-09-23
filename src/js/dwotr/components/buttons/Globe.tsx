import Show from '@/components/helpers/Show';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { GlobeAltIcon as GlobeAltIconFull } from '@heroicons/react/24/solid';
import { useState } from 'preact/hooks';


const Globe = ({ onClick, size = 14, ...props }) => {

    const [active, setActive] = useState(false);

    const activeClass = active ? 'text-iris-brown' : 'hover:text-iris-brown text-neutral-500';
    const className = `btn-ghost btn-sm hover:bg-transparent ${activeClass} ${props.className || ''}`;

    const onClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        setActive(!active);
        onClick(!active);
    };
    

    return (
        <button {...props}  onClick={onClickHandler} className={className}  >
            <Show when={active}>
                <GlobeAltIconFull width={size} height={size}  />
            </Show>
            <Show when={!active}>
                <GlobeAltIcon width={size} height={size} />
            </Show>
        </button>
    );
}

export default Globe;

